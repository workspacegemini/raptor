import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user', () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should reject duplicate email', async () => {
      const registerDto = {
        email: `duplicate-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // Duplicate registration
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('should validate email format', () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    let testUser: any;

    beforeAll(async () => {
      const registerDto = {
        email: `login-test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto);

      testUser = res.body.user;
      testUser.password = registerDto.password;
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const registerDto = {
        email: `me-test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto);

      accessToken = res.body.accessToken;
    });

    it('should return current user with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('firstName');
          expect(res.body).toHaveProperty('lastName');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const registerDto = {
        email: `refresh-test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Corp',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto);

      refreshToken = res.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });
});
