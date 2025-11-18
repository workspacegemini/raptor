import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get organization analytics overview' })
  @ApiResponse({ status: 200, description: 'Overview statistics retrieved successfully' })
  getOverview(@CurrentUser() user: any) {
    return this.analyticsService.getOverview(user.organizationId);
  }

  @Get('learning-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get learning activity trends' })
  @ApiResponse({ status: 200, description: 'Learning activity data retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze (default: 30)' })
  getLearningActivity(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getLearningActivity(user.organizationId, days);
  }

  @Get('top-courses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get top courses by enrollment' })
  @ApiResponse({ status: 200, description: 'Top courses retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of courses to return (default: 10)' })
  getTopCourses(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getTopCourses(user.organizationId, limit);
  }

  @Get('user-engagement')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user engagement metrics' })
  @ApiResponse({ status: 200, description: 'User engagement metrics retrieved successfully' })
  getUserEngagement(@CurrentUser() user: any) {
    return this.analyticsService.getUserEngagement(user.organizationId);
  }

  @Get('competency-matrix')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get competency distribution matrix' })
  @ApiResponse({ status: 200, description: 'Competency matrix retrieved successfully' })
  getCompetencyMatrix(@CurrentUser() user: any) {
    return this.analyticsService.getCompetencyMatrix(user.organizationId);
  }

  @Get('team-performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team performance comparison' })
  @ApiResponse({ status: 200, description: 'Team performance metrics retrieved successfully' })
  getTeamPerformance(@CurrentUser() user: any) {
    return this.analyticsService.getTeamPerformance(user.organizationId);
  }

  @Get('ai-generation-stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Get AI content generation statistics' })
  @ApiResponse({ status: 200, description: 'AI generation statistics retrieved successfully' })
  getAIGenerationStats(@CurrentUser() user: any) {
    return this.analyticsService.getAIGenerationStats(user.organizationId);
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['users', 'enrollments', 'progress', 'competencies'],
    description: 'Type of data to export'
  })
  exportData(
    @CurrentUser() user: any,
    @Query('type') dataType: string,
  ) {
    return this.analyticsService.exportData(user.organizationId, dataType);
  }
}
