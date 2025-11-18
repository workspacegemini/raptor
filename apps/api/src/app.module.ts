import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiGenerationModule } from './modules/ai-generation/ai-generation.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SkillsModule } from './modules/skills/skills.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { TeamsModule } from './modules/teams/teams.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { LoggerService } from './common/services/logger.service';
import { CacheService } from './common/services/cache.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Bull Queue for async jobs
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Prisma ORM
    PrismaModule,

    // Feature modules
    AuthModule,
    AiGenerationModule,
    OrganizationsModule,
    UsersModule,
    CoursesModule,
    SkillsModule,
    LessonsModule,
    EnrollmentsModule,
    TeamsModule,
    AnalyticsModule,

    // Infrastructure modules
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    CacheService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
