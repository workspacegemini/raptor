import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClaudeService } from '../services/claude.service';
import { EmbeddingsService } from '../services/embeddings.service';
import { JobStatus } from '@prisma/client';

interface LessonGenerationJobData {
  jobId: string;
  documentText: string;
  targetLessonCount: number;
  courseId: string;
  organizationId: string;
  userId: string;
}

@Processor('lesson-generation')
export class LessonGeneratorProcessor {
  private readonly logger = new Logger(LessonGeneratorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeService: ClaudeService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  @Process('generate-lessons')
  async handleLessonGeneration(job: Job<LessonGenerationJobData>) {
    const { jobId, documentText, targetLessonCount, courseId, organizationId } = job.data;

    this.logger.log(`Processing lesson generation job ${jobId}`);

    try {
      // Update job status to PROCESSING
      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PROCESSING,
          startedAt: new Date(),
          progress: 10,
        },
      });

      // Generate lessons using Claude
      await job.progress(20);
      const generatedLessons = await this.claudeService.generateLessonsFromDocument(
        documentText,
        targetLessonCount,
      );

      await job.progress(60);

      // Create lessons in database with embeddings
      const createdLessons = [];

      for (let i = 0; i < generatedLessons.length; i++) {
        const lesson = generatedLessons[i];

        this.logger.log(`Creating lesson ${i + 1}/${generatedLessons.length}: ${lesson.title}`);

        // Generate embedding for lesson content
        const embeddingText = `${lesson.title}\n\n${lesson.description}\n\n${lesson.content}`;
        const embedding = await this.embeddingsService.generateEmbedding(embeddingText);

        // Create lesson
        const createdLesson = await this.prisma.lesson.create({
          data: {
            title: lesson.title,
            description: lesson.description,
            content: lesson.content,
            duration: lesson.duration,
            type: 'TEXT',
            order: i,
            courseId,
            embedding,
            embeddingModel: 'text-embedding-ada-002',
          },
        });

        // Store embedding in Pinecone
        await this.embeddingsService.storeLessonEmbedding(createdLesson.id, embedding, {
          courseId,
          organizationId,
          title: lesson.title,
          description: lesson.description,
          contentType: 'TEXT',
        });

        // Create quiz for this lesson
        if (lesson.quiz && lesson.quiz.length > 0) {
          await this.prisma.quiz.create({
            data: {
              title: `${lesson.title} - Quiz`,
              lessonId: createdLesson.id,
              passingScore: 70,
              questions: {
                create: lesson.quiz.map((q, qIndex) => ({
                  question: q.question,
                  explanation: q.explanation,
                  type: q.correctAnswers.length > 1 ? 'MULTIPLE_SELECT' : 'MULTIPLE_CHOICE',
                  order: qIndex,
                  options: q.options,
                  correctAnswers: q.correctAnswers,
                  points: 1,
                })),
              },
            },
          });
        }

        createdLessons.push({
          id: createdLesson.id,
          title: createdLesson.title,
          description: createdLesson.description,
        });

        // Update progress
        const progress = 60 + Math.floor((40 * (i + 1)) / generatedLessons.length);
        await job.progress(progress);
        await this.prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: { progress },
        });
      }

      // Mark job as completed
      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          generatedLessons: createdLessons,
        },
      });

      await job.progress(100);

      this.logger.log(`Successfully completed job ${jobId} - Created ${createdLessons.length} lessons`);

      return {
        success: true,
        lessonsCreated: createdLessons.length,
        lessons: createdLessons,
      };
    } catch (error) {
      this.logger.error(`Failed to process job ${jobId}`, error);

      // Mark job as failed
      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
