import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto, UpdateUserPreferencesDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all users in organization' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    const skip = page && pageSize ? (page - 1) * pageSize : 0;
    const take = pageSize || 50;

    return this.usersService.findAll(user.organizationId, {
      skip,
      take,
      role,
      status,
      search,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id, user.organizationId);
  }

  @Get('me/progress')
  @ApiOperation({ summary: 'Get current user progress' })
  getMyProgress(@CurrentUser() user: any) {
    return this.usersService.getProgress(user.id, user.organizationId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser() user: any, @Body() updateDto: UpdateUserDto) {
    return this.usersService.update(user.id, user.organizationId, updateDto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(@CurrentUser() user: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, user.organizationId, changePasswordDto);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  updateMyPreferences(@CurrentUser() user: any, @Body() preferencesDto: UpdateUserPreferencesDto) {
    return this.usersService.updatePreferences(user.id, user.organizationId, preferencesDto);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() updateDto: UpdateUserDto) {
    return this.usersService.update(id, user.organizationId, updateDto);
  }

  @Get(':id/progress')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user progress' })
  getProgress(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getProgress(id, user.organizationId);
  }

  @Post(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user (Admin only)' })
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.suspend(id, user.organizationId);
  }

  @Post(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.activate(id, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.remove(id, user.organizationId);
  }
}
