import { Test, TestingModule } from '@nestjs/testing';
import { AiGenerationService } from './ai-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

jest.mock('@anthropic-ai/sdk');
jest.mock('openai');
jest.mock('@pinecone-database/pinecone');

describe('AiGenerationService', () => {
  let service: AiGenerationService;
  let prisma: PrismaService;
  let aiQueue: Queue;

  const mockPrismaService = {
    aiJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
    },
    lesson: {
      createMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockAnthropicClient = {
    messages: {
      create: jest.fn(),
    },
  };

  const mockOpenAIClient = {
    embeddings: {
      create: jest.fn(),
    },
  };

  const mockPineconeClient = {
    index: jest.fn().mockReturnValue({
      upsert: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGenerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('ai-generation'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AiGenerationService>(AiGenerationService);
    prisma = module.get<PrismaService>(PrismaService);
    aiQueue = module.get<Queue>(getQueueToken('ai-generation'));

    // Mock the AI clients
    (Anthropic as jest.Mock).mockImplementation(() => mockAnthropicClient);
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAIClient);
    (Pinecone as jest.Mock).mockImplementation(() => mockPineconeClient);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDocument', () => {
    const mockFile = {
      buffer: Buffer.from('test content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    it('should analyze PDF document using Claude', async () => {
      const mockAnalysis = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test summary',
              topics: ['Topic 1', 'Topic 2'],
              suggestedLessonCount: 5,
              difficulty: 'intermediate',
              estimatedHours: 10,
            }),
          },
        ],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(mockAnalysis);

      const result = await service.analyzeDocument(mockFile, 'org-123');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('suggestedLessonCount');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });

    it('should handle analysis errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.analyzeDocument(mockFile, 'org-123'),
      ).rejects.toThrow();
    });
  });

  describe('generateLessons', () => {
    const mockFile = {
      buffer: Buffer.from('test content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    const courseId = 'course-123';
    const organizationId = 'org-123';

    it('should create AI job and queue lesson generation', async () => {
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        organizationId,
      };
      const mockJob = {
        id: 'job-123',
        courseId,
        organizationId,
        status: 'PENDING',
        type: 'LESSON_GENERATION',
      };

      mockPrismaService.course.findFirst.mockResolvedValue(mockCourse);
      mockPrismaService.aiJob.create.mockResolvedValue(mockJob);
      mockQueue.add.mockResolvedValue({ id: 'queue-job-123' });

      const result = await service.generateLessons(
        courseId,
        mockFile,
        organizationId,
        5,
      );

      expect(result).toEqual(mockJob);
      expect(mockPrismaService.aiJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          courseId,
          organizationId,
          type: 'LESSON_GENERATION',
          status: 'PENDING',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-lessons',
        expect.any(Object),
      );
    });

    it('should throw error if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(
        service.generateLessons(courseId, mockFile, organizationId),
      ).rejects.toThrow('Course not found');
    });
  });

  describe('getJobStatus', () => {
    const jobId = 'job-123';
    const organizationId = 'org-123';

    it('should return job status', async () => {
      const mockJob = {
        id: jobId,
        organizationId,
        status: 'COMPLETED',
        progress: 100,
        result: { lessonsCreated: 5 },
      };

      mockPrismaService.aiJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId, organizationId);

      expect(result).toEqual(mockJob);
    });

    it('should throw error if job not found', async () => {
      mockPrismaService.aiJob.findUnique.mockResolvedValue(null);

      await expect(
        service.getJobStatus('non-existent', organizationId),
      ).rejects.toThrow('Job not found');
    });

    it('should respect multi-tenancy', async () => {
      await service.getJobStatus(jobId, organizationId);

      expect(mockPrismaService.aiJob.findUnique).toHaveBeenCalledWith({
        where: {
          id: jobId,
          organizationId,
        },
      });
    });
  });

  describe('cancelJob', () => {
    const jobId = 'job-123';
    const organizationId = 'org-123';

    it('should cancel pending job', async () => {
      const mockJob = {
        id: jobId,
        organizationId,
        status: 'PENDING',
        queueJobId: 'queue-job-123',
      };
      const canceledJob = {
        ...mockJob,
        status: 'CANCELLED',
      };

      mockPrismaService.aiJob.findUnique.mockResolvedValue(mockJob);
      mockPrismaService.aiJob.update.mockResolvedValue(canceledJob);
      mockQueue.getJob.mockResolvedValue({
        remove: jest.fn(),
      });

      const result = await service.cancelJob(jobId, organizationId);

      expect(result.status).toBe('CANCELLED');
      expect(mockPrismaService.aiJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: { status: 'CANCELLED' },
      });
    });

    it('should not cancel completed job', async () => {
      const mockJob = {
        id: jobId,
        organizationId,
        status: 'COMPLETED',
      };

      mockPrismaService.aiJob.findUnique.mockResolvedValue(mockJob);

      await expect(
        service.cancelJob(jobId, organizationId),
      ).rejects.toThrow('Cannot cancel completed job');
    });
  });

  describe('createEmbedding', () => {
    it('should create embedding using OpenAI', async () => {
      const text = 'Test content for embedding';
      const mockEmbedding = {
        data: [
          {
            embedding: [0.1, 0.2, 0.3],
          },
        ],
      };

      mockOpenAIClient.embeddings.create.mockResolvedValue(mockEmbedding);

      const result = await service.createEmbedding(text);

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockOpenAIClient.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: text,
      });
    });
  });
});
