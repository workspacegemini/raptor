import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import * as os from 'os';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async checkDatabase(): Promise<{ status: string; latency: number; details?: any }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        details: { error: error.message },
      };
    }
  }

  async checkRedis(): Promise<{ status: string; latency: number; details?: any }> {
    try {
      const start = Date.now();
      await this.cache.set('health:check', { timestamp: Date.now() }, 10);
      const value = await this.cache.get('health:check');
      const latency = Date.now() - start;

      if (!value) {
        throw new Error('Redis read/write failed');
      }

      await this.cache.del('health:check');

      const stats = await this.cache.getStats();

      return {
        status: 'healthy',
        latency,
        details: {
          keysCount: stats.keysCount,
          connected: stats.connected,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        details: { error: error.message },
      };
    }
  }

  async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usagePercent: Math.round(memUsagePercent * 100) / 100,
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAverage: {
          '1min': Math.round(loadAvg[0] * 100) / 100,
          '5min': Math.round(loadAvg[1] * 100) / 100,
          '15min': Math.round(loadAvg[2] * 100) / 100,
        },
      },
      uptime: {
        system: this.formatUptime(os.uptime()),
        process: this.formatUptime(process.uptime()),
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
      },
    };
  }

  async getApplicationMetrics() {
    const [
      totalOrganizations,
      totalUsers,
      totalCourses,
      totalLessons,
      totalEnrollments,
      activeAIJobs,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.lesson.count({ where: { deletedAt: null } }),
      this.prisma.enrollment.count(),
      this.prisma.aiGenerationJob.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
    ]);

    return {
      organizations: totalOrganizations,
      users: totalUsers,
      courses: totalCourses,
      lessons: totalLessons,
      enrollments: totalEnrollments,
      activeAIJobs,
    };
  }

  async getDetailedHealth() {
    const [database, redis, system, application] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getSystemMetrics(),
      this.getApplicationMetrics(),
    ]);

    const isHealthy =
      database.status === 'healthy' &&
      redis.status === 'healthy' &&
      system.memory.usagePercent < 90;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database,
        redis,
      },
      metrics: {
        system,
        application,
      },
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '<1m';
  }
}
