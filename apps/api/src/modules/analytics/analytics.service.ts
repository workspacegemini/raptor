import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getOverview(organizationId: string) {
    this.logger.log(`Getting overview analytics for organization ${organizationId}`);

    const cacheKey = `analytics:overview:${organizationId}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const [
          totalUsers,
          activeUsers,
          totalCourses,
          publishedCourses,
          totalLessons,
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalTeams,
        ] = await Promise.all([
          this.prisma.user.count({
            where: { organizationId, deletedAt: null },
          }),
          this.prisma.user.count({
            where: {
              organizationId,
              status: 'ACTIVE',
              deletedAt: null,
            },
          }),
          this.prisma.course.count({
            where: { organizationId, deletedAt: null },
          }),
          this.prisma.course.count({
            where: {
              organizationId,
              status: 'PUBLISHED',
              deletedAt: null,
            },
          }),
          this.prisma.lesson.count({
            where: {
              course: { organizationId },
              deletedAt: null,
            },
          }),
          this.prisma.enrollment.count({
            where: { course: { organizationId } },
          }),
          this.prisma.enrollment.count({
            where: {
              course: { organizationId },
              status: 'ACTIVE',
            },
          }),
          this.prisma.enrollment.count({
            where: {
              course: { organizationId },
              status: 'COMPLETED',
            },
          }),
          this.prisma.team.count({
            where: { organizationId, deletedAt: null },
          }),
        ]);

        return {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
          },
          courses: {
            total: totalCourses,
            published: publishedCourses,
            draft: totalCourses - publishedCourses,
          },
          lessons: {
            total: totalLessons,
          },
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            completed: completedEnrollments,
            completionRate:
              totalEnrollments > 0
                ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
                : 0,
          },
          teams: {
            total: totalTeams,
          },
        };
      },
      this.cache.ttl.medium,
    );
  }

  async getLearningActivity(organizationId: string, days: number = 30) {
    this.logger.log(`Getting learning activity for last ${days} days`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [enrollmentsByDay, lessonProgressByDay, completionsByDay] = await Promise.all([
      // New enrollments per day
      this.prisma.$queryRaw`
        SELECT DATE(enrolled_at) as date, COUNT(*)::int as count
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.organization_id = ${organizationId}
          AND e.enrolled_at >= ${startDate}
        GROUP BY DATE(enrolled_at)
        ORDER BY date DESC
      `,

      // Lesson progress updates per day
      this.prisma.$queryRaw`
        SELECT DATE(lp.updated_at) as date, COUNT(*)::int as count
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        WHERE c.organization_id = ${organizationId}
          AND lp.updated_at >= ${startDate}
        GROUP BY DATE(lp.updated_at)
        ORDER BY date DESC
      `,

      // Completions per day
      this.prisma.$queryRaw`
        SELECT DATE(completed_at) as date, COUNT(*)::int as count
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.organization_id = ${organizationId}
          AND e.completed_at >= ${startDate}
          AND e.completed_at IS NOT NULL
        GROUP BY DATE(completed_at)
        ORDER BY date DESC
      `,
    ]);

    return {
      enrollments: enrollmentsByDay,
      lessonProgress: lessonProgressByDay,
      completions: completionsByDay,
    };
  }

  async getTopCourses(organizationId: string, limit: number = 10) {
    this.logger.log(`Getting top ${limit} courses`);

    const courses = await this.prisma.course.findMany({
      where: {
        organizationId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        type: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        enrollments: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    // Get completion stats for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const completedCount = await this.prisma.enrollment.count({
          where: {
            courseId: course.id,
            status: 'COMPLETED',
          },
        });

        const totalEnrollments = course._count.enrollments;
        const completionRate =
          totalEnrollments > 0
            ? Math.round((completedCount / totalEnrollments) * 10000) / 100
            : 0;

        return {
          id: course.id,
          title: course.title,
          type: course.type,
          enrollments: totalEnrollments,
          completions: completedCount,
          completionRate,
        };
      }),
    );

    return coursesWithStats;
  }

  async getUserEngagement(organizationId: string) {
    this.logger.log('Getting user engagement metrics');

    const [
      totalUsers,
      usersWithEnrollments,
      usersWithCompletions,
      avgEnrollmentsPerUser,
      avgCompletionsPerUser,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          deletedAt: null,
          enrollments: {
            some: {},
          },
        },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          deletedAt: null,
          enrollments: {
            some: {
              status: 'COMPLETED',
            },
          },
        },
      }),
      this.prisma.enrollment.groupBy({
        by: ['userId'],
        where: {
          course: { organizationId },
        },
        _count: {
          userId: true,
        },
      }).then((results) => {
        const total = results.reduce((sum, r) => sum + r._count.userId, 0);
        return results.length > 0 ? total / results.length : 0;
      }),
      this.prisma.enrollment.groupBy({
        by: ['userId'],
        where: {
          course: { organizationId },
          status: 'COMPLETED',
        },
        _count: {
          userId: true,
        },
      }).then((results) => {
        const total = results.reduce((sum, r) => sum + r._count.userId, 0);
        return results.length > 0 ? total / results.length : 0;
      }),
    ]);

    const engagementRate = totalUsers > 0 ? (usersWithEnrollments / totalUsers) * 100 : 0;

    return {
      totalUsers,
      usersWithEnrollments,
      usersWithCompletions,
      engagementRate: Math.round(engagementRate * 100) / 100,
      averageEnrollmentsPerUser: Math.round(avgEnrollmentsPerUser * 100) / 100,
      averageCompletionsPerUser: Math.round(avgCompletionsPerUser * 100) / 100,
    };
  }

  async getCompetencyMatrix(organizationId: string) {
    this.logger.log('Getting competency matrix');

    const competencies = await this.prisma.userCompetency.groupBy({
      by: ['skillId', 'level'],
      where: {
        user: { organizationId },
      },
      _count: {
        userId: true,
      },
    });

    // Group by skill
    const skillIds = [...new Set(competencies.map((c) => c.skillId))];
    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
        organizationId,
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    const matrix = skills.map((skill) => {
      const skillCompetencies = competencies.filter((c) => c.skillId === skill.id);

      const levelCounts = {
        AWARE: 0,
        NOVICE: 0,
        COMPETENT: 0,
        PROFICIENT: 0,
        EXPERT: 0,
      };

      skillCompetencies.forEach((c) => {
        levelCounts[c.level] = c._count.userId;
      });

      const total = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);

      return {
        skill: {
          id: skill.id,
          name: skill.name,
          category: skill.category,
        },
        distribution: levelCounts,
        total,
      };
    });

    return matrix;
  }

  async getTeamPerformance(organizationId: string) {
    this.logger.log('Getting team performance metrics');

    const teams = await this.prisma.team.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: true,
            enrollments: true,
          },
        },
      },
    });

    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const completedEnrollments = await this.prisma.enrollment.count({
          where: {
            teamId: team.id,
            status: 'COMPLETED',
          },
        });

        const avgProgress = await this.prisma.enrollment.aggregate({
          where: { teamId: team.id },
          _avg: { progress: true },
        });

        const completionRate =
          team._count.enrollments > 0
            ? (completedEnrollments / team._count.enrollments) * 100
            : 0;

        return {
          team: {
            id: team.id,
            name: team.name,
          },
          members: team._count.members,
          enrollments: team._count.enrollments,
          completions: completedEnrollments,
          completionRate: Math.round(completionRate * 100) / 100,
          averageProgress: Math.round((avgProgress._avg.progress || 0) * 100) / 100,
        };
      }),
    );

    return teamsWithStats.sort((a, b) => b.completionRate - a.completionRate);
  }

  async getAIGenerationStats(organizationId: string) {
    this.logger.log('Getting AI generation statistics');

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      avgLessonsGenerated,
    ] = await Promise.all([
      this.prisma.aiGenerationJob.count({
        where: { organizationId },
      }),
      this.prisma.aiGenerationJob.count({
        where: {
          organizationId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.aiGenerationJob.count({
        where: {
          organizationId,
          status: 'FAILED',
        },
      }),
      this.prisma.aiGenerationJob.count({
        where: {
          organizationId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
      this.prisma.aiGenerationJob.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
        },
        _avg: { targetLessonCount: true },
      }),
    ]);

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return {
      total: totalJobs,
      completed: completedJobs,
      failed: failedJobs,
      pending: pendingJobs,
      successRate: Math.round(successRate * 100) / 100,
      averageLessonsPerJob: Math.round((avgLessonsGenerated._avg.targetLessonCount || 0) * 100) / 100,
    };
  }

  async exportData(organizationId: string, dataType: string) {
    this.logger.log(`Exporting ${dataType} data for organization ${organizationId}`);

    switch (dataType) {
      case 'users':
        return this.prisma.user.findMany({
          where: { organizationId, deletedAt: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });

      case 'enrollments':
        return this.prisma.enrollment.findMany({
          where: { course: { organizationId } },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            course: {
              select: {
                title: true,
                type: true,
              },
            },
          },
        });

      case 'progress':
        return this.prisma.lessonProgress.findMany({
          where: {
            lesson: {
              course: { organizationId },
            },
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            lesson: {
              select: {
                title: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        });

      case 'competencies':
        return this.prisma.userCompetency.findMany({
          where: {
            user: { organizationId },
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            skill: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        });

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }
}
