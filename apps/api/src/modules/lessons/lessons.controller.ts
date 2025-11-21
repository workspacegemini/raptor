import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/prisma-types';
import {
  CreateLessonDto,
  UpdateLessonDto,
  QueryLessonsDto,
  ReorderLessonsDto,
  TrackProgressDto,
  CreateQuizDto
} from './dto';
import { ICurrentUser } from '../../common/interfaces';

@ApiTags('lessons')
@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create new lesson' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  create(@Body() createDto: CreateLessonDto, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.create(createDto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all lessons' })
  @ApiResponse({ status: 200, description: 'List of lessons' })
  findAll(@CurrentUser() user: ICurrentUser, @Query() query: QueryLessonsDto) {
    return this.lessonsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by ID' })
  @ApiResponse({ status: 200, description: 'Lesson found' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.findOne(id, user.organizationId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Update lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  update(@Param('id') id: string, @Body() updateDto: UpdateLessonDto, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.update(id, user.organizationId, updateDto);
  }

  @Post('reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Reorder lessons in a course' })
  @ApiResponse({ status: 200, description: 'Lessons reordered successfully' })
  reorder(@Body() body: ReorderLessonsDto, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.reorder(body.courseId, user.organizationId, body.lessonIds);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.remove(id, user.organizationId);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Track lesson progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  trackProgress(@Param('id') id: string, @Body() progressDto: TrackProgressDto, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.trackProgress(id, user.id, user.organizationId, progressDto);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get lesson progress for current user' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  getProgress(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.getProgress(id, user.id, user.organizationId);
  }

  @Post(':id/quiz')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Add quiz to lesson' })
  @ApiResponse({ status: 201, description: 'Quiz added successfully' })
  addQuiz(@Param('id') id: string, @Body() quizDto: CreateQuizDto, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.addQuiz(id, user.organizationId, quizDto);
  }

  @Get(':id/statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get lesson statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.lessonsService.getStatistics(id, user.organizationId);
  }
}
