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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('skills')
@Controller('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create new skill' })
  create(@Body() createDto: any, @CurrentUser() user: any) {
    return this.skillsService.create(createDto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all skills' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.skillsService.findAll(user.organizationId, query);
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get skills hierarchy tree' })
  getHierarchy(@CurrentUser() user: any) {
    return this.skillsService.getHierarchy(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get skill by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.skillsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update skill' })
  update(@Param('id') id: string, @Body() updateDto: any, @CurrentUser() user: any) {
    return this.skillsService.update(id, user.organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete skill' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.skillsService.remove(id, user.organizationId);
  }
}
