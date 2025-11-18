import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { EnrollmentStatus, ProgressStatus } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async enroll(courseId: string, userId: string, organizationId: string, teamId?: string) {
    this.logger.log(`Enrolling user ${userId} in course ${courseId}`);

    // Verify course exists and is published
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    // Check if already enrolled
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User already enrolled in this course');
    }

    // Verify team belongs to organization if provided
    if (teamId) {
      const team = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId,
          deletedAt: null,
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        teamId,
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            type: true,
            estimatedDuration: true,
          },
        },
      },
    });

    // Invalidate user cache
    await this.cache.invalidateUser(userId);

    this.logger.log(`User ${userId} enrolled in course ${courseId}`);
    return enrollment;
  }

  async bulkEnroll(courseId: string, userIds: string[], organizationId: string, teamId?: string) {
    this.logger.log(`Bulk enrolling ${userIds.length} users in course ${courseId}`);

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    // Filter out already enrolled users
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingEnrollments.map((e) => e.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      throw new BadRequestException('All users are already enrolled');
    }

    // Create enrollments
    const enrollments = await this.prisma.enrollment.createMany({
      data: newUserIds.map((userId) => ({
        userId,
        courseId,
        teamId,
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
      })),
    });

    // Invalidate caches
    await Promise.all(newUserIds.map((userId) => this.cache.invalidateUser(userId)));

    this.logger.log(`Bulk enrolled ${enrollments.count} users in course ${courseId}`);
    return {
      enrolled: enrollments.count,
      skipped: existingUserIds.size,
      total: userIds.length,
    };
  }

  async findAll(params: {
    organizationId: string;
    userId?: string;
    courseId?: string;
    teamId?: string;
    status?: EnrollmentStatus;
    skip?: number;
    take?: number;
  }) {
    const { organizationId, userId, courseId, teamId, status, skip = 0, take = 50 } = params;

    const where: any = {
      course: { organizationId },
    };

    if (userId) where.userId = userId;
    if (courseId) where.courseId = courseId;
    if (teamId) where.teamId = teamId;
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take,
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              estimatedDuration: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      data: enrollments,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        course: { organizationId },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                duration: true,
                order: true,
              },
            },
          },
        },
        team: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Get lesson progress
    const lessonProgress = await this.prisma.lessonProgress.findMany({
      where: {
        userId: enrollment.userId,
        lessonId: { in: enrollment.course.lessons.map((l) => l.id) },
      },
    });

    return {
      ...enrollment,
      lessonProgress,
    };
  }

  async updateProgress(enrollmentId: string, organizationId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        course: { organizationId },
      },
      include: {
        course: {
          include: {
            lessons: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const totalLessons = enrollment.course.lessons.length;
    if (totalLessons === 0) {
      return enrollment;
    }

    // Count completed lessons
    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId: enrollment.userId,
        lessonId: { in: enrollment.course.lessons.map((l) => l.id) },
        status: ProgressStatus.COMPLETED,
      },
    });

    const progress = (completedLessons / totalLessons) * 100;
    const isCompleted = completedLessons === totalLessons;

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        status: isCompleted ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        ...(isCompleted && { completedAt: new Date() }),
      },
    });

    // Invalidate cache
    await this.cache.invalidateUser(enrollment.userId);

    this.logger.log(`Updated progress for enrollment ${enrollmentId}: ${progress}%`);
    return updated;
  }

  async unenroll(enrollmentId: string, organizationId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        course: { organizationId },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.DROPPED },
    });

    // Invalidate cache
    await this.cache.invalidateUser(enrollment.userId);

    this.logger.log(`User unenrolled from course: ${enrollmentId}`);
    return updated;
  }

  async getStatistics(organizationId: string, courseId?: string) {
    const where: any = {
      course: { organizationId },
    };

    if (courseId) {
      where.courseId = courseId;
    }

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      droppedEnrollments,
      avgProgress,
    ] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.count({
        where: { ...where, status: EnrollmentStatus.ACTIVE },
      }),
      this.prisma.enrollment.count({
        where: { ...where, status: EnrollmentStatus.COMPLETED },
      }),
      this.prisma.enrollment.count({
        where: { ...where, status: EnrollmentStatus.DROPPED },
      }),
      this.prisma.enrollment.aggregate({
        where,
        _avg: { progress: true },
      }),
    ]);

    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const dropRate = totalEnrollments > 0 ? (droppedEnrollments / totalEnrollments) * 100 : 0;

    return {
      total: totalEnrollments,
      active: activeEnrollments,
      completed: completedEnrollments,
      dropped: droppedEnrollments,
      completionRate: Math.round(completionRate * 100) / 100,
      dropRate: Math.round(dropRate * 100) / 100,
      averageProgress: Math.round((avgProgress._avg.progress || 0) * 100) / 100,
    };
  }

  async getLeaderboard(courseId: string, organizationId: string, limit: number = 10) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const leaderboard = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      orderBy: [
        { progress: 'desc' },
        { updatedAt: 'asc' },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      progress: entry.progress,
      status: entry.status,
      enrolledAt: entry.enrolledAt,
      completedAt: entry.completedAt,
    }));
  }

  async getMyEnrollments(userId: string, organizationId: string, status?: EnrollmentStatus) {
    const where: any = {
      userId,
      course: {
        organizationId,
        deletedAt: null,
      },
    };

    if (status) {
      where.status = status;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            thumbnailUrl: true,
            estimatedDuration: true,
          },
        },
      },
    });

    return enrollments;
  }
}
