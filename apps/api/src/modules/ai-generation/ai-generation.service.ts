import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { ClaudeService } from './services/claude.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentProcessor: DocumentProcessorService,
    private readonly claudeService: ClaudeService,
    @InjectQueue('lesson-generation') private readonly lessonQueue: Queue,
  ) {}

  async generateLessonsFromDocument(
    file: Express.Multer.File,
    courseId: string,
    organizationId: string,
    userId: string,
    targetLessonCount?: number,
  ) {
    this.logger.log(`Starting lesson generation for course ${courseId}`);

    // Verify course exists and belongs to organization
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Process document
    const documentText = await this.documentProcessor.processDocument(file);

    // Estimate lesson count if not provided
    const lessonCount = targetLessonCount || this.documentProcessor.estimateLessonCount(documentText);

    this.logger.log(`Target lesson count: ${lessonCount}`);

    // Create AI generation job
    const job = await this.prisma.aiGenerationJob.create({
      data: {
        organizationId,
        userId,
        courseId,
        documentName: file.originalname,
        targetLessonCount: lessonCount,
        status: JobStatus.PENDING,
        progress: 0,
      },
    });

    // Queue the lesson generation job
    await this.lessonQueue.add('generate-lessons', {
      jobId: job.id,
      documentText,
      targetLessonCount: lessonCount,
      courseId,
      organizationId,
      userId,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      timeout: 600000, // 10 minutes
    });

    this.logger.log(`Queued lesson generation job ${job.id}`);

    return {
      jobId: job.id,
      status: job.status,
      targetLessonCount: lessonCount,
    };
  }

  async getJobStatus(jobId: string, organizationId: string) {
    const job = await this.prisma.aiGenerationJob.findFirst({
      where: {
        id: jobId,
        organizationId,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      generatedLessons: job.generatedLessons,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  async listJobs(organizationId: string, userId?: string, limit: number = 50) {
    const jobs = await this.prisma.aiGenerationJob.findMany({
      where: {
        organizationId,
        ...(userId && { userId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
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

    return jobs;
  }

  async analyzeDocument(file: Express.Multer.File) {
    this.logger.log(`Analyzing document: ${file.originalname}`);

    // Process document
    const documentText = await this.documentProcessor.processDocument(file);

    // Get AI analysis
    const analysis = await this.claudeService.analyzeDocumentStructure(documentText);

    // Estimate lesson count
    const estimatedLessonCount = this.documentProcessor.estimateLessonCount(documentText);

    return {
      analysis,
      estimatedLessonCount,
      documentLength: documentText.length,
    };
  }

  async cancelJob(jobId: string, organizationId: string) {
    const job = await this.prisma.aiGenerationJob.findFirst({
      where: {
        id: jobId,
        organizationId,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return { message: 'Job already completed or failed' };
    }

    // Update job status
    await this.prisma.aiGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    // Try to remove from queue
    const bullJobs = await this.lessonQueue.getJobs(['waiting', 'active', 'delayed']);
    const bullJob = bullJobs.find((j) => j.data.jobId === jobId);

    if (bullJob) {
      await bullJob.remove();
    }

    return { message: 'Job cancelled successfully' };
  }
}
