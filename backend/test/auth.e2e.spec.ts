import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests
 *
 * These tests require a running database connection.
 * They test the full auth journey: register → login → protected routes → refresh → logout
 * → password reset → login with new password → lockout recovery.
 *
 * To run: npx jest test/auth.e2e.spec.ts
 * Requires: DATABASE_URL environment variable
 */
jest.setTimeout(30000);

// Mock ThrottlerGuard globally so rate limiting never blocks E2E tests
jest.mock('@nestjs/throttler', () => {
  const actual = jest.requireActual('@nestjs/throttler');
  return {
    ...actual,
    ThrottlerGuard: class MockThrottlerGuard {
      canActivate() {
        return true;
      }
    },
  };
});

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

  // ─── Password Reset → Login ─────────────────────

  describe('Password Reset → Login', () => {
    let resetToken: string;
    let preResetRefreshToken: string;
    const newPassword = 'NewPassword456!';

    it('should login to get a fresh refresh token before reset', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const data = res.body.data || res.body;
      accessToken = data.accessToken;
      preResetRefreshToken = data.refreshToken;
    });

    it('should request password reset and receive resetUrl in dev', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toBeDefined();
      expect(data.resetUrl).toBeDefined();

      // Extract token from URL: .../auth/reset-password?token=UUID
      const url = new URL(data.resetUrl);
      resetToken = url.searchParams.get('token')!;
      expect(resetToken).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toBeDefined();
    });

    it('should reject login with old password after reset', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(401);
    });

    it('should login with new password after reset', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: newPassword })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should access protected route with post-reset token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.email).toBe(testEmail);
    });

    it('should reject old refresh token after password reset', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: preResetRefreshToken })
        .expect(401);
    });
  });

  // ─── Account Lockout + Reset Recovery ───────────

  describe('Account Lockout + Reset Recovery', () => {
    const lockoutEmail = `e2e-lockout-${Date.now()}@test.com`;
    const lockoutPassword = 'LockoutTest123!';
    const newLockoutPassword = 'UnlockedPass456!';

    it('should register a user for lockout test', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Lockout Test User',
          email: lockoutEmail,
          password: lockoutPassword,
          crm: '654321/RJ',
          gender: 'FEMALE',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.user.email).toBe(lockoutEmail);
    });

    it('should lock account after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: lockoutEmail, password: 'WrongPassword!' });
      }

      // 6th attempt with CORRECT password should fail because account is locked
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: lockoutEmail, password: lockoutPassword })
        .expect(401);

      expect(res.body.message).toContain('bloqueada');
    });

    it('should recover from lockout via password reset and login', async () => {
      // Request password reset
      const forgotRes = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: lockoutEmail })
        .expect(200);

      const forgotData = forgotRes.body.data || forgotRes.body;
      const url = new URL(forgotData.resetUrl);
      const token = url.searchParams.get('token')!;

      // Reset password
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: newLockoutPassword })
        .expect(200);

      // Login with new password should succeed (lockout cleared by reset)
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: lockoutEmail, password: newLockoutPassword })
        .expect(200);

      const loginData = loginRes.body.data || loginRes.body;
      expect(loginData.accessToken).toBeDefined();
      expect(loginData.user.email).toBe(lockoutEmail);
    });
  });

  // ─── Password Reset Edge Cases ──────────────────

  describe('Password Reset Edge Cases', () => {
    it('should reject reset with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token-uuid', password: 'SomePass123!' })
        .expect(400);
    });

    it('should return same response for non-existing email (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'does-not-exist-ever@nowhere.com' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toBeDefined();
      // Should NOT contain resetUrl for non-existing email
      expect(data.resetUrl).toBeUndefined();
    });
  });
});
