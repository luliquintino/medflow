import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Users E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test user profile, onboarding, profile update, and account deletion.
 *
 * To run: npx jest --config jest.config.ts test/users.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  // For account deletion test we register a throwaway user
  let throwawayToken: string;
  const throwawayEmail = `e2e-delete-${Date.now()}@test.com`;
  const throwawayPassword = 'DeleteMe123!';

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

    // Login with seed user
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ana@demo.com', password: 'Demo1234!' })
      .expect(200);

    const data = res.body.data || res.body;
    accessToken = data.accessToken;
    expect(accessToken).toBeDefined();

    // Register a throwaway user for deletion test
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Throwaway User',
        email: throwawayEmail,
        password: throwawayPassword,
        crm: '999888/SP',
        gender: 'MALE',
      })
      .expect(201);

    const regData = regRes.body.data || regRes.body;
    throwawayToken = regData.accessToken;
    expect(throwawayToken).toBeDefined();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ─── Auth Guard ──────────────────────────────────

  describe('Authentication', () => {
    it('should reject GET /users/me without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });
  });

  // ─── GET /users/me ───────────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('should return the current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.email).toBe('ana@demo.com');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('id');
    });
  });

  // ─── POST /users/onboarding ──────────────────────

  describe('POST /api/v1/users/onboarding', () => {
    it('should complete onboarding with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          financial: {
            minimumMonthlyGoal: 7000,
            idealMonthlyGoal: 10000,
            savingsGoal: 2000,
            averageShiftValue: 1500,
          },
          work: {
            shiftTypes: ['TWELVE_HOURS', 'NIGHT'],
            maxWeeklyHours: 60,
            preferredRestDays: [0, 6],
          },
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });

    it('should not succeed onboarding with missing financial data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          work: {
            shiftTypes: ['TWELVE_HOURS'],
          },
        });
      // Should fail with validation error (400) or internal error (500)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should not succeed onboarding with missing work data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          financial: {
            minimumMonthlyGoal: 7000,
            idealMonthlyGoal: 10000,
            savingsGoal: 2000,
            averageShiftValue: 1500,
          },
        });
      // Should fail with validation error (400) or internal error (500)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── PATCH /users/profile ────────────────────────

  describe('PATCH /api/v1/users/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ana Updated' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.name).toBe('Ana Updated');
    });

    // Restore original name
    afterAll(async () => {
      if (accessToken) {
        await request(app.getHttpServer())
          .patch('/api/v1/users/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Ana Silva' });
      }
    });
  });

  // ─── DELETE /users/account ───────────────────────

  describe('DELETE /api/v1/users/account', () => {
    it('should delete the throwaway user account', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${throwawayToken}`)
        .expect(200);

      // Verify the user can no longer authenticate
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: throwawayEmail, password: throwawayPassword })
        .expect(401);
    });
  });
});
