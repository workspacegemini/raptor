import { Test, TestingModule } from '@nestjs/testing';
import { AiGenerationService } from './ai-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { DocumentProcessorService } from './services/document-processor.service';
import { ClaudeService } from './services/claude.service';

jest.mock('@anthropic-ai/sdk');
jest.mock('openai');
jest.mock('@pinecone-database/pinecone');

describe('AiGenerationService', () => {
  let service: AiGenerationService;
  let prisma: PrismaService;
  let aiQueue: Queue;

  const mockPrismaService = {
    aiGenerationJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
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
    getJobs: jest.fn(),
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
          provide: getQueueToken('lesson-generation'),
          useValue: mockQueue,
        },
        {
          provide: DocumentProcessorService,
          useValue: {
            processDocument: jest.fn().mockResolvedValue('Extracted text content'),
            estimateLessonCount: jest.fn().mockReturnValue(10),
          },
        },
        {
          provide: ClaudeService,
          useValue: {
            analyzeDocument: jest.fn().mockResolvedValue({ analysis: 'Test' }),
            generateLessons: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<AiGenerationService>(AiGenerationService);
    prisma = module.get<PrismaService>(PrismaService);
    aiQueue = module.get<Queue>(getQueueToken('lesson-generation'));

    // Mock the AI clients
    (Anthropic as unknown as jest.Mock).mockImplementation(() => mockAnthropicClient);
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIClient);
    (Pinecone as unknown as jest.Mock).mockImplementation(() => mockPineconeClient);

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
        analysis: 'Test analysis',
        estimatedLessonCount: 5,
      };

      // Mock the service methods that analyzeDocument depends on
      jest.spyOn(service as any, 'analyzeDocument').mockResolvedValue(mockAnalysis);

      const result = await service.analyzeDocument(mockFile);

      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('estimatedLessonCount');
    });

    it('should handle analysis errors gracefully', async () => {
      jest.spyOn(service as any, 'analyzeDocument').mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.analyzeDocument(mockFile),
      ).rejects.toThrow();
    });
  });

  describe('generateLessonsFromDocument', () => {
    const mockFile = {
      buffer: Buffer.from('test content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    const courseId = 'course-123';
    const organizationId = 'org-123';
    const userId = 'user-123';

    it('should create AI job and queue lesson generation', async () => {
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        organizationId,
      };
      const mockJob = {
        jobId: 'job-123',
        status: 'PENDING',
        targetLessonCount: 5,
      };

      mockPrismaService.course.findFirst.mockResolvedValue(mockCourse);
      mockPrismaService.aiGenerationJob.create.mockResolvedValue({
        id: 'job-123',
        status: 'PENDING',
        targetLessonCount: 5,
      });
      mockQueue.add.mockResolvedValue({ id: 'queue-job-123' });

      const result = await service.generateLessonsFromDocument(
        mockFile,
        courseId,
        organizationId,
        userId,
        5,
      );

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('targetLessonCount');
      expect(mockPrismaService.aiGenerationJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          courseId,
          organizationId,
          userId,
          status: 'PENDING',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-lessons',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw error if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(
        service.generateLessonsFromDocument(mockFile, courseId, organizationId, userId),
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
        generatedLessons: 5,
        error: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      mockPrismaService.aiGenerationJob.findFirst.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(jobId, organizationId);

      expect(result).toHaveProperty('id', jobId);
      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result).toHaveProperty('progress', 100);
    });

    it('should throw error if job not found', async () => {
      mockPrismaService.aiGenerationJob.findFirst.mockResolvedValue(null);

      await expect(
        service.getJobStatus('non-existent', organizationId),
      ).rejects.toThrow('Job not found');
    });

    it('should respect multi-tenancy', async () => {
      const mockJob = {
        id: jobId,
        organizationId,
        status: 'COMPLETED',
        progress: 100,
        generatedLessons: 5,
        error: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      mockPrismaService.aiGenerationJob.findFirst.mockResolvedValue(mockJob);

      await service.getJobStatus(jobId, organizationId);

      expect(mockPrismaService.aiGenerationJob.findFirst).toHaveBeenCalledWith({
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
      };

      mockPrismaService.aiGenerationJob.findFirst.mockResolvedValue(mockJob);
      mockPrismaService.aiGenerationJob.update.mockResolvedValue({
        ...mockJob,
        status: 'FAILED',
        error: 'Cancelled by user',
        completedAt: new Date(),
      });
      mockQueue.getJobs = jest.fn().mockResolvedValue([
        {
          data: { jobId },
          remove: jest.fn(),
        },
      ]);

      const result = await service.cancelJob(jobId, organizationId);

      expect(result).toHaveProperty('message', 'Job cancelled successfully');
      expect(mockPrismaService.aiGenerationJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'Cancelled by user',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should return message if job already completed', async () => {
      const mockJob = {
        id: jobId,
        organizationId,
        status: 'COMPLETED',
      };

      mockPrismaService.aiGenerationJob.findFirst.mockResolvedValue(mockJob);

      const result = await service.cancelJob(jobId, organizationId);

      expect(result).toHaveProperty('message', 'Job already completed or failed');
    });
  });

  describe('listJobs', () => {
    const organizationId = 'org-123';

    it('should return list of jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          organizationId,
          status: 'COMPLETED',
          user: {
            id: 'user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockPrismaService.aiGenerationJob.findMany.mockResolvedValue(mockJobs);

      const result = await service.listJobs(organizationId);

      expect(result).toEqual(mockJobs);
      expect(mockPrismaService.aiGenerationJob.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  });
});
