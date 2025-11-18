import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { LessonType, ProgressStatus } from '@prisma/client';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(data: any, organizationId: string) {
    this.logger.log(`Creating lesson: ${data.title}`);

    // Verify course exists and belongs to organization
    const course = await this.prisma.course.findFirst({
      where: { id: data.courseId, organizationId, deletedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get next order number
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { courseId: data.courseId, deletedAt: null },
      orderBy: { order: 'desc' },
    });

    const order = data.order !== undefined ? data.order : (lastLesson?.order || 0) + 1;

    const lesson = await this.prisma.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content || '',
        type: data.type || LessonType.TEXT,
        order,
        duration: data.duration || 0,
        courseId: data.courseId,
        videoId: data.videoId,
        thumbnailUrl: data.thumbnailUrl,
        resources: data.resources || [],
        embedding: data.embedding || [],
        embeddingModel: data.embeddingModel,
      },
      include: {
        video: true,
        _count: { select: { quizzes: true } },
      },
    });

    // Invalidate course cache
    await this.cache.del(this.cache.keys.course(data.courseId));

    this.logger.log(`Created lesson: ${lesson.id}`);
    return lesson;
  }

  async findAll(organizationId: string, params?: any) {
    const { courseId, type, search, skip = 0, take = 50 } = params || {};

    const where: any = {
      course: { organizationId },
      deletedAt: null,
    };

    if (courseId) where.courseId = courseId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        skip,
        take,
        orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
        include: {
          course: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          video: {
            select: {
              id: true,
              muxPlaybackId: true,
              status: true,
              duration: true,
            },
          },
          _count: {
            select: {
              quizzes: true,
              progress: true,
              skills: true,
            },
          },
        },
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      data: lessons,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, organizationId: string, userId?: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        course: { organizationId },
        deletedAt: null,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
          },
        },
        video: true,
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // If userId provided, include progress
    if (userId) {
      const progress = await this.prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: id,
          },
        },
      });

      return {
        ...lesson,
        userProgress: progress,
      };
    }

    return lesson;
  }

  async update(id: string, organizationId: string, data: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const updated = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.type && { type: data.type }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.videoId !== undefined && { videoId: data.videoId }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.resources !== undefined && { resources: data.resources }),
        ...(data.embedding !== undefined && { embedding: data.embedding }),
      },
    });

    // Invalidate caches
    await this.cache.del(this.cache.keys.lesson(id));
    await this.cache.del(this.cache.keys.course(lesson.courseId));

    this.logger.log(`Updated lesson: ${id}`);
    return updated;
  }

  async reorder(courseId: string, organizationId: string, lessonIds: string[]) {
    // Verify course exists
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId, deletedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Update order for each lesson
    const updates = lessonIds.map((lessonId, index) =>
      this.prisma.lesson.updateMany({
        where: {
          id: lessonId,
          courseId,
          deletedAt: null,
        },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    // Invalidate cache
    await this.cache.del(this.cache.keys.course(courseId));

    this.logger.log(`Reordered ${lessonIds.length} lessons in course ${courseId}`);
    return { message: 'Lessons reordered successfully' };
  }

  async remove(id: string, organizationId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Invalidate caches
    await this.cache.del(this.cache.keys.lesson(id));
    await this.cache.del(this.cache.keys.course(lesson.courseId));

    this.logger.log(`Soft deleted lesson: ${id}`);
    return { message: 'Lesson deleted successfully' };
  }

  // Progress tracking
  async trackProgress(lessonId: string, userId: string, organizationId: string, data: any) {
    // Verify lesson exists
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        progress: data.progress,
        lastPosition: data.lastPosition,
        status: data.status || ProgressStatus.IN_PROGRESS,
        ...(data.status === ProgressStatus.COMPLETED && {
          completedAt: new Date(),
        }),
      },
      create: {
        userId,
        lessonId,
        progress: data.progress || 0,
        lastPosition: data.lastPosition || 0,
        status: data.status || ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
        ...(data.status === ProgressStatus.COMPLETED && {
          completedAt: new Date(),
        }),
      },
    });

    // Invalidate user progress cache
    await this.cache.invalidateUser(userId);

    this.logger.log(`Updated progress for user ${userId} on lesson ${lessonId}`);
    return progress;
  }

  async getProgress(lessonId: string, userId: string, organizationId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    return progress || {
      userId,
      lessonId,
      status: ProgressStatus.NOT_STARTED,
      progress: 0,
      lastPosition: 0,
    };
  }

  // Quiz management
  async addQuiz(lessonId: string, organizationId: string, data: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        lessonId,
        passingScore: data.passingScore || 70,
        randomize: data.randomize || false,
        questions: {
          create: data.questions.map((q: any, index: number) => ({
            question: q.question,
            explanation: q.explanation,
            type: q.type,
            order: index,
            options: q.options,
            correctAnswers: q.correctAnswers,
            points: q.points || 1,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    // Invalidate cache
    await this.cache.del(this.cache.keys.lesson(lessonId));

    this.logger.log(`Added quiz to lesson ${lessonId}`);
    return quiz;
  }

  async getStatistics(lessonId: string, organizationId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        course: { organizationId },
        deletedAt: null,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const [
      totalViews,
      completedCount,
      inProgressCount,
      avgProgress,
      avgQuizScore,
    ] = await Promise.all([
      this.prisma.lessonProgress.count({
        where: { lessonId },
      }),
      this.prisma.lessonProgress.count({
        where: {
          lessonId,
          status: ProgressStatus.COMPLETED,
        },
      }),
      this.prisma.lessonProgress.count({
        where: {
          lessonId,
          status: ProgressStatus.IN_PROGRESS,
        },
      }),
      this.prisma.lessonProgress.aggregate({
        where: { lessonId },
        _avg: { progress: true },
      }),
      this.prisma.lessonProgress.aggregate({
        where: {
          lessonId,
          quizScore: { not: null },
        },
        _avg: { quizScore: true },
      }),
    ]);

    const completionRate = totalViews > 0 ? (completedCount / totalViews) * 100 : 0;

    return {
      totalViews,
      completedCount,
      inProgressCount,
      notStartedCount: totalViews - completedCount - inProgressCount,
      completionRate: Math.round(completionRate * 100) / 100,
      averageProgress: Math.round((avgProgress._avg.progress || 0) * 100) / 100,
      averageQuizScore: Math.round((avgQuizScore._avg.quizScore || 0) * 100) / 100,
    };
  }
}
