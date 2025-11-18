import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { CacheService } from '../../common/services/cache.service';

@Module({
  controllers: [LessonsController],
  providers: [LessonsService, CacheService],
  exports: [LessonsService],
})
export class LessonsModule {}
