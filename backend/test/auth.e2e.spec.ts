import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests
 *
 * These tests require a running database connection.
 * They test the full auth journey: register → login → protected routes → refresh → logout.
 *
 * To run: npx jest --config jest.config.ts test/auth.e2e-spec.ts
 * Requires: DATABASE_URL environment variable
 */
jest.setTimeout(15000);

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const testEmail = `e2e-test-${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ─── Register ──────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'E2E Test User',
          email: testEmail,
          password: testPassword,
          crm: '123456/SP',
          gender: 'MALE',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      const data = res.body.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate',
          email: testEmail,
          password: testPassword,
          crm: '999999/SP',
          gender: 'MALE',
        })
        .expect(409);
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: testPassword,
          crm: '111111/SP',
          gender: 'MALE',
        })
        .expect(400);
    });
  });

  // ─── Login ─────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' })
        .expect(401);
    });

    it('should reject non-existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: testPassword })
        .expect(401);
    });
  });

  // ─── Protected Routes ──────────────────────────

  describe('Protected routes', () => {
    it('should access /api/v1/users/me with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.email).toBe(testEmail);
    });

    it('should reject access without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });
  });

  // ─── Token Refresh ─────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  // ─── Forgot Password ──────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return success for existing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toBeDefined();
    });

    it('should return success even for non-existing email (no enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toBeDefined();
    });
  });

  // ─── Logout ────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should logout with valid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });

    it('should reject logout without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);
    });
  });
});
