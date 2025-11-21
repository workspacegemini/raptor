import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '../src/common/types/prisma-types';

describe('Courses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let learnerToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create admin user
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `admin-${Date.now()}@example.com`,
        password: 'Admin123!@#',
        firstName: 'Admin',
        lastName: 'User',
        organizationName: 'Test Org',
      });

    adminToken = adminRes.body.accessToken;
    organizationId = adminRes.body.user.organizationId;

    // Create learner user
    const learnerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `learner-${Date.now()}@example.com`,
        password: 'Learner123!@#',
        firstName: 'Learner',
        lastName: 'User',
        organizationName: 'Test Org 2',
      });

    learnerToken = learnerRes.body.accessToken;

    // Update admin role
    await prisma.user.update({
      where: { id: adminRes.body.user.id },
      data: { role: UserRole.ORG_ADMIN },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/api/v1/courses (POST)', () => {
    it('should create a course as admin', () => {
      const createDto = {
        title: 'Test Course',
        description: 'A test course for e2e testing',
        category: 'Technology',
        level: 'BEGINNER',
        estimatedHours: 10,
      };

      return request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe(createDto.title);
          expect(res.body.organizationId).toBe(organizationId);
        });
    });

    it('should reject course creation without auth', () => {
      const createDto = {
        title: 'Unauthorized Course',
        description: 'Should fail',
      };

      return request(app.getHttpServer())
        .post('/api/v1/courses')
        .send(createDto)
        .expect(401);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing title',
        })
        .expect(400);
    });
  });

  describe('/api/v1/courses (GET)', () => {
    beforeAll(async () => {
      // Create test courses
      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Course 1',
          description: 'First course',
          category: 'Technology',
        });

      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Course 2',
          description: 'Second course',
          category: 'Business',
        });
    });

    it('should list courses for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should filter courses by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses?status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((course: any) => {
            expect(course.status).toBe('DRAFT');
          });
        });
    });

    it('should respect multi-tenancy (not see other org courses)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      // Learner should not see admin's courses (different org)
      const adminCourses = res.body.filter(
        (course: any) => course.organizationId === organizationId,
      );
      expect(adminCourses.length).toBe(0);
    });
  });

  describe('/api/v1/courses/:id (GET)', () => {
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Get Test Course',
          description: 'For testing GET endpoint',
        });

      courseId = res.body.id;
    });

    it('should get course by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(courseId);
          expect(res.body.title).toBe('Get Test Course');
        });
    });

    it('should return 404 for non-existent course', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/courses/:id (PATCH)', () => {
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Update Test Course',
          description: 'For testing UPDATE endpoint',
        });

      courseId = res.body.id;
    });

    it('should update course as admin', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Title');
          expect(res.body.description).toBe('Updated description');
        });
    });
  });

  describe('/api/v1/courses/:id/publish (POST)', () => {
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Publish Test Course',
          description: 'For testing PUBLISH endpoint',
        });

      courseId = res.body.id;
    });

    it('should publish course as admin', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('PUBLISHED');
        });
    });
  });

  describe('/api/v1/courses/:id (DELETE)', () => {
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Delete Test Course',
          description: 'For testing DELETE endpoint',
        });

      courseId = res.body.id;
    });

    it('should soft delete course as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify soft delete
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      expect(course?.deletedAt).not.toBeNull();
    });
  });
});
