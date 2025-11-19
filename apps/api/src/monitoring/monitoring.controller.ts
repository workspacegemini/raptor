import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller()
export class MonitoringController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('/metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('/metrics/json')
  @Public()
  @ApiOperation({ summary: 'Get metrics as JSON' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved as JSON' })
  async getMetricsJSON(): Promise<any> {
    return this.metricsService.getMetricsJSON();
  }
}
