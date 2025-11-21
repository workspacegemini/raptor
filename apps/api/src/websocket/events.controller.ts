import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/prisma-types';

@ApiTags('WebSocket')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly websocketService: WebSocketService) {}

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Get WebSocket connection statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Connection stats retrieved successfully' })
  getStats() {
    return this.websocketService.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check WebSocket health' })
  @ApiResponse({ status: 200, description: 'WebSocket is healthy' })
  getHealth() {
    const stats = this.websocketService.getStats();

    return {
      status: 'healthy',
      connections: stats.totalConnections,
      timestamp: new Date().toISOString(),
    };
  }
}
