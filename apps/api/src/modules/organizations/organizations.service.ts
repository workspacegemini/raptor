import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto, UpdateOrganizationSettingsDto } from './dto/update-organization.dto';
import { OrganizationStatus } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrganizationDto) {
    this.logger.log(`Creating organization: ${createDto.name}`);

    // Check if slug already exists
    const existing = await this.prisma.organization.findUnique({
      where: { slug: createDto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization with this slug already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: createDto.name,
        slug: createDto.slug,
        domain: createDto.domain,
        logoUrl: createDto.logoUrl,
        settings: createDto.settings || {},
        status: OrganizationStatus.ACTIVE,
      },
    });

    this.logger.log(`Created organization: ${organization.id}`);
    return organization;
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    status?: OrganizationStatus;
    search?: string;
  }) {
    const { skip = 0, take = 50, status, search } = params || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }

    where.deletedAt = null;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              courses: true,
              teams: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            users: true,
            courses: true,
            teams: true,
            skills: true,
            aiGenerationJobs: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateDto: UpdateOrganizationDto) {
    await this.findOne(id); // Verify exists

    this.logger.log(`Updating organization: ${id}`);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.domain !== undefined && { domain: updateDto.domain }),
        ...(updateDto.logoUrl !== undefined && { logoUrl: updateDto.logoUrl }),
        ...(updateDto.status && { status: updateDto.status }),
        ...(updateDto.settings && { settings: updateDto.settings }),
      },
    });

    this.logger.log(`Updated organization: ${id}`);
    return organization;
  }

  async updateSettings(id: string, settingsDto: UpdateOrganizationSettingsDto) {
    await this.findOne(id); // Verify exists

    this.logger.log(`Updating organization settings: ${id}`);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        settings: settingsDto.settings,
      },
    });

    this.logger.log(`Updated organization settings: ${id}`);
    return organization;
  }

  async getSettings(id: string) {
    const organization = await this.findOne(id);
    return organization.settings || {};
  }

  async suspend(id: string) {
    this.logger.log(`Suspending organization: ${id}`);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.SUSPENDED },
    });

    this.logger.log(`Suspended organization: ${id}`);
    return organization;
  }

  async activate(id: string) {
    this.logger.log(`Activating organization: ${id}`);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.ACTIVE },
    });

    this.logger.log(`Activated organization: ${id}`);
    return organization;
  }

  async remove(id: string) {
    await this.findOne(id); // Verify exists

    this.logger.log(`Soft deleting organization: ${id}`);

    // Soft delete
    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: OrganizationStatus.INACTIVE,
      },
    });

    this.logger.log(`Soft deleted organization: ${id}`);
    return { message: 'Organization deleted successfully' };
  }

  async getStatistics(id: string) {
    await this.findOne(id); // Verify exists

    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      totalTeams,
      totalEnrollments,
      completedEnrollments,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { organizationId: id, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          organizationId: id,
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
      this.prisma.course.count({
        where: { organizationId: id, deletedAt: null },
      }),
      this.prisma.course.count({
        where: {
          organizationId: id,
          status: 'PUBLISHED',
          deletedAt: null,
        },
      }),
      this.prisma.lesson.count({
        where: {
          course: { organizationId: id },
          deletedAt: null,
        },
      }),
      this.prisma.team.count({
        where: { organizationId: id, deletedAt: null },
      }),
      this.prisma.enrollment.count({
        where: {
          course: { organizationId: id },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          course: { organizationId: id },
          status: 'COMPLETED',
        },
      }),
    ]);

    const avgCompletionRate =
      totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: totalCourses - publishedCourses,
      },
      lessons: {
        total: totalLessons,
      },
      teams: {
        total: totalTeams,
      },
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments,
        inProgress: totalEnrollments - completedEnrollments,
        completionRate: Math.round(avgCompletionRate * 100) / 100,
      },
    };
  }

  async getUsersByRole(id: string) {
    await this.findOne(id);

    const users = await this.prisma.user.groupBy({
      by: ['role'],
      where: {
        organizationId: id,
        deletedAt: null,
      },
      _count: {
        role: true,
      },
    });

    return users.map((u) => ({
      role: u.role,
      count: u._count.role,
    }));
  }
}
