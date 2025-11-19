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
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, TeamMemberRole } from '@prisma/client';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  create(@Body() createDto: any, @CurrentUser() user: any) {
    return this.teamsService.create(createDto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.teamsService.findAll(user.organizationId, query);
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get team hierarchy tree' })
  @ApiResponse({ status: 200, description: 'Team hierarchy retrieved successfully' })
  getHierarchy(@CurrentUser() user: any) {
    return this.teamsService.getHierarchy(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team found' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  update(@Param('id') id: string, @Body() updateDto: any, @CurrentUser() user: any) {
    return this.teamsService.update(id, user.organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.remove(id, user.organizationId);
  }

  @Post(':id/members')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  addMember(
    @Param('id') id: string,
    @Body() memberDto: { userId: string; role?: TeamMemberRole },
    @CurrentUser() user: any,
  ) {
    return this.teamsService.addMember(
      id,
      memberDto.userId,
      user.organizationId,
      memberDto.role,
    );
  }

  @Delete(':teamId/members/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamsService.removeMember(teamId, userId, user.organizationId);
  }

  @Put(':teamId/members/:userId/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() roleDto: { role: TeamMemberRole },
    @CurrentUser() user: any,
  ) {
    return this.teamsService.updateMemberRole(teamId, userId, user.organizationId, roleDto.role);
  }

  @Get(':id/statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.getStatistics(id, user.organizationId);
  }
}
