import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiGenerationModule } from './modules/ai-generation/ai-generation.module';

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

    // Additional modules (to be implemented)
    // UsersModule,
    // OrganizationsModule,
    // CoursesModule,
    // LessonsModule,
    // SkillsModule,
    // AnalyticsModule,
    // VideoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
