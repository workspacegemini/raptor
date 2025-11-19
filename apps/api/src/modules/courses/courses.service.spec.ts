import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { CourseStatus } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    course: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'Test Course',
      description: 'A test course',
      category: 'Technology',
      level: 'BEGINNER' as any,
      estimatedHours: 10,
    };
    const organizationId = 'org-123';

    it('should create a new course', async () => {
      const mockCourse = {
        id: 'course-123',
        ...createDto,
        organizationId,
        status: CourseStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.course.create.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, organizationId);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          organizationId,
          status: CourseStatus.DRAFT,
        },
      });
    });

    it('should invalidate cache after creation', async () => {
      const mockCourse = {
        id: 'course-123',
        ...createDto,
        organizationId,
      };

      mockPrismaService.course.create.mockResolvedValue(mockCourse);

      await service.create(createDto, organizationId);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        `courses:org:${organizationId}`,
      );
    });
  });

  describe('findAll', () => {
    const organizationId = 'org-123';

    it('should return courses from cache if available', async () => {
      const cachedCourses = [
        { id: 'course-1', title: 'Course 1' },
        { id: 'course-2', title: 'Course 2' },
      ];

      mockCacheService.get.mockResolvedValue(cachedCourses);

      const result = await service.findAll(organizationId, {});

      expect(result).toEqual(cachedCourses);
      expect(mockPrismaService.course.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache misses', async () => {
      const mockCourses = [
        { id: 'course-1', title: 'Course 1' },
        { id: 'course-2', title: 'Course 2' },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findAll(organizationId, {});

      expect(result).toEqual(mockCourses);
      expect(mockPrismaService.course.findMany).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findMany.mockResolvedValue([]);

      await service.findAll(organizationId, { status: CourseStatus.PUBLISHED });

      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          deletedAt: null,
          status: CourseStatus.PUBLISHED,
        },
        include: expect.any(Object),
      });
    });

    it('should apply pagination', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findMany.mockResolvedValue([]);

      await service.findAll(organizationId, { page: 2, pageSize: 10 });

      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        skip: 10,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    const courseId = 'course-123';
    const organizationId = 'org-123';

    it('should return a course if found', async () => {
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        organizationId,
      };

      mockPrismaService.course.findFirst.mockResolvedValue(mockCourse);

      const result = await service.findOne(courseId, organizationId);

      expect(result).toEqual(mockCourse);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', organizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should respect multi-tenancy', async () => {
      await service.findOne(courseId, organizationId);

      expect(mockPrismaService.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: courseId,
          organizationId,
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    const courseId = 'course-123';
    const organizationId = 'org-123';
    const updateDto = {
      title: 'Updated Course',
      description: 'Updated description',
    };

    it('should update a course', async () => {
      const existingCourse = {
        id: courseId,
        title: 'Old Title',
        organizationId,
      };
      const updatedCourse = {
        ...existingCourse,
        ...updateDto,
      };

      mockPrismaService.course.findFirst.mockResolvedValue(existingCourse);
      mockPrismaService.course.update.mockResolvedValue(updatedCourse);

      const result = await service.update(courseId, updateDto, organizationId);

      expect(result).toEqual(updatedCourse);
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `courses:org:${organizationId}`,
      );
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(
        service.update(courseId, updateDto, organizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    const courseId = 'course-123';
    const organizationId = 'org-123';

    it('should publish a draft course', async () => {
      const draftCourse = {
        id: courseId,
        title: 'Draft Course',
        status: CourseStatus.DRAFT,
        organizationId,
      };
      const publishedCourse = {
        ...draftCourse,
        status: CourseStatus.PUBLISHED,
      };

      mockPrismaService.course.findFirst.mockResolvedValue(draftCourse);
      mockPrismaService.course.update.mockResolvedValue(publishedCourse);

      const result = await service.publish(courseId, organizationId);

      expect(result.status).toBe(CourseStatus.PUBLISHED);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: CourseStatus.PUBLISHED },
      });
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(service.publish(courseId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const courseId = 'course-123';
    const organizationId = 'org-123';

    it('should soft delete a course', async () => {
      const existingCourse = {
        id: courseId,
        title: 'Course to Delete',
        organizationId,
      };
      const deletedCourse = {
        ...existingCourse,
        deletedAt: new Date(),
      };

      mockPrismaService.course.findFirst.mockResolvedValue(existingCourse);
      mockPrismaService.course.update.mockResolvedValue(deletedCourse);

      const result = await service.remove(courseId, organizationId);

      expect(result.deletedAt).toBeDefined();
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(courseId, organizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
