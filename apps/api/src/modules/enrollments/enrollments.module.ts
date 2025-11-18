import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CacheService } from '../../common/services/cache.service';

@Module({
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, CacheService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
