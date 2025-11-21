import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, EnrollmentStatus } from '../../common/types/prisma-types';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  enroll(@Body() enrollDto: { courseId: string; teamId?: string }, @CurrentUser() user: any) {
    return this.enrollmentsService.enroll(
      enrollDto.courseId,
      user.id,
      user.organizationId,
      enrollDto.teamId,
    );
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk enroll users in a course (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Users enrolled successfully' })
  bulkEnroll(
    @Body() bulkDto: { courseId: string; userIds: string[]; teamId?: string },
    @CurrentUser() user: any,
  ) {
    return this.enrollmentsService.bulkEnroll(
      bulkDto.courseId,
      bulkDto.userIds,
      user.organizationId,
      bulkDto.teamId,
    );
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all enrollments (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  findAll(
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: EnrollmentStatus,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const skip = page && pageSize ? (page - 1) * pageSize : 0;
    const take = pageSize || 50;

    return this.enrollmentsService.findAll({
      organizationId: user.organizationId,
      courseId,
      userId,
      teamId,
      status,
      skip,
      take,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my enrollments' })
  @ApiResponse({ status: 200, description: 'List of user enrollments' })
  getMyEnrollments(@CurrentUser() user: any, @Query('status') status?: EnrollmentStatus) {
    return this.enrollmentsService.getMyEnrollments(user.id, user.organizationId, status);
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get enrollment statistics' })
  @ApiResponse({ status: 200, description: 'Enrollment statistics' })
  getStatistics(@CurrentUser() user: any, @Query('courseId') courseId?: string) {
    return this.enrollmentsService.getStatistics(user.organizationId, courseId);
  }

  @Get('leaderboard/:courseId')
  @ApiOperation({ summary: 'Get course leaderboard' })
  @ApiResponse({ status: 200, description: 'Course leaderboard' })
  getLeaderboard(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.enrollmentsService.getLeaderboard(
      courseId,
      user.organizationId,
      limit ? parseInt(limit as any) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({ status: 200, description: 'Enrollment found' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.findOne(id, user.organizationId);
  }

  @Post(':id/update-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate enrollment progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  updateProgress(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.updateProgress(id, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll from course' })
  @ApiResponse({ status: 200, description: 'Successfully unenrolled' })
  unenroll(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.unenroll(id, user.organizationId);
  }
}
