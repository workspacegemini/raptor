import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringInterceptor } from './monitoring.interceptor';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [MetricsService, MonitoringInterceptor],
  exports: [MetricsService, MonitoringInterceptor],
})
export class MonitoringModule {}
