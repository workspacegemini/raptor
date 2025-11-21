import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, ChangePasswordDto, UpdateUserPreferencesDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../../common/types/prisma-types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, params?: {
    skip?: number;
    take?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }) {
    const { skip = 0, take = 50, role, status, search } = params || {};

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          phoneNumber: true,
          role: true,
          status: true,
          organizationId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
        role: true,
        status: true,
        organizationId: true,
        preferences: true,
        metadata: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            lessonProgress: true,
            competencies: true,
            teamMemberships: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, organizationId: string, updateDto: UpdateUserDto) {
    await this.findOne(id, organizationId); // Verify exists

    // Check email uniqueness if changing email
    if (updateDto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: updateDto.email,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    this.logger.log(`Updating user: ${id}`);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateDto.email && { email: updateDto.email }),
        ...(updateDto.firstName && { firstName: updateDto.firstName }),
        ...(updateDto.lastName && { lastName: updateDto.lastName }),
        ...(updateDto.phoneNumber !== undefined && { phoneNumber: updateDto.phoneNumber }),
        ...(updateDto.avatarUrl !== undefined && { avatarUrl: updateDto.avatarUrl }),
        ...(updateDto.role && { role: updateDto.role }),
        ...(updateDto.status && { status: updateDto.status }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
        role: true,
        status: true,
        organizationId: true,
      },
    });

    this.logger.log(`Updated user: ${id}`);
    return user;
  }

  async changePassword(id: string, organizationId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    this.logger.log(`Password changed for user: ${id}`);
    return { message: 'Password changed successfully. Please login again.' };
  }

  async updatePreferences(id: string, organizationId: string, preferencesDto: UpdateUserPreferencesDto) {
    await this.findOne(id, organizationId);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        preferences: preferencesDto.preferences,
      },
      select: {
        id: true,
        preferences: true,
      },
    });

    this.logger.log(`Updated preferences for user: ${id}`);
    return user;
  }

  async getProgress(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    const [enrollments, completedLessons, competencies] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId: id },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.lessonProgress.count({
        where: {
          userId: id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.userCompetency.findMany({
        where: { userId: id },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      }),
    ]);

    return {
      enrollments: {
        total: enrollments.length,
        completed: enrollments.filter((e: typeof enrollments[number]) => e.status === 'COMPLETED').length,
        inProgress: enrollments.filter((e: typeof enrollments[number]) => e.status === 'ACTIVE').length,
        courses: enrollments,
      },
      lessons: {
        completed: completedLessons,
      },
      competencies: {
        total: competencies.length,
        byLevel: competencies.reduce((acc: Record<string, number>, c: typeof competencies[number]) => {
          acc[c.level] = (acc[c.level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        skills: competencies,
      },
    };
  }

  async suspend(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    this.logger.log(`Suspending user: ${id}`);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return user;
  }

  async activate(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    this.logger.log(`Activating user: ${id}`);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    return user;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    this.logger.log(`Soft deleting user: ${id}`);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return { message: 'User deleted successfully' };
  }
}
