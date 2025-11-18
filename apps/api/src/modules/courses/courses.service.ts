import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatus, CourseType } from '@prisma/client';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId: string, organizationId: string) {
    this.logger.log(`Creating course: ${data.title}`);

    const course = await this.prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        type: data.type || CourseType.STANDARD,
        status: CourseStatus.DRAFT,
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        tags: data.tags || [],
        organizationId,
        createdById: userId,
      },
      include: {
        _count: { select: { lessons: true, enrollments: true } },
      },
    });

    return course;
  }

  async findAll(organizationId: string, params?: any) {
    const { skip = 0, take = 50, status, type, search } = params || {};

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { lessons: true, enrollments: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        lessons: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            duration: true,
            order: true,
          },
        },
        skills: {
          include: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: string, organizationId: string, userId: string, data: any) {
    await this.findOne(id, organizationId);

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.type && { type: data.type }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        ...(data.estimatedDuration && { estimatedDuration: data.estimatedDuration }),
        ...(data.tags && { tags: data.tags }),
        updatedById: userId,
      },
    });

    return course;
  }

  async publish(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    this.logger.log(`Published course: ${id}`);
    return course;
  }

  async archive(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    const course = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    });

    return course;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Course deleted successfully' };
  }
}
