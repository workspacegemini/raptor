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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateCourseDto, UpdateCourseDto, QueryCoursesDto } from './dto';
import { ICurrentUser } from '../../common/interfaces';

@ApiTags('courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create new course' })
  create(@Body() createDto: CreateCourseDto, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.create(createDto, user.id, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all courses' })
  findAll(@CurrentUser() user: ICurrentUser, @Query() query: QueryCoursesDto) {
    return this.coursesService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Update course' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCourseDto, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.update(id, user.organizationId, user.id, updateDto);
  }

  @Post(':id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSTRUCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish course' })
  publish(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.publish(id, user.organizationId);
  }

  @Post(':id/archive')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive course' })
  archive(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.archive(id, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete course' })
  remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.coursesService.remove(id, user.organizationId);
  }
}
