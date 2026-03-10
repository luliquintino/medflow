import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Dashboard E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test the consolidated dashboard endpoint that aggregates finance, workload, and risk.
 *
 * To run: npx jest --config jest.config.ts test/dashboard.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

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
  });

  afterAll(async () => {
    await app?.close();
  });

  // ─── GET /dashboard ───────────────────────────────────

  describe('GET /api/v1/dashboard', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .expect(401);
    });

    it('should return consolidated dashboard with finance, workload, and risk', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Dashboard should have all three sections plus timestamp
      expect(data).toHaveProperty('finance');
      expect(data).toHaveProperty('workload');
      expect(data).toHaveProperty('risk');
      expect(data).toHaveProperty('generatedAt');
    });

    it('should return correct shape for each dashboard section', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Finance section should contain the summary fields
      if (data.finance) {
        expect(data.finance).toHaveProperty('currentRevenue');
        expect(data.finance).toHaveProperty('progressToMinimum');
        expect(data.finance).toHaveProperty('profile');
        expect(data.finance.profile).toHaveProperty('averageShiftValue');
      }

      // Workload section should contain shift/hours stats
      if (data.workload) {
        expect(data.workload).toHaveProperty('shiftsThisMonth');
        expect(data.workload).toHaveProperty('totalHoursThisMonth');
        expect(data.workload).toHaveProperty('totalHoursThisWeek');
      }

      // Risk section should contain level and score
      if (data.risk) {
        expect(data.risk).toHaveProperty('level');
        expect(data.risk).toHaveProperty('score');
        expect(['SAFE', 'MODERATE', 'HIGH']).toContain(data.risk.level);
        expect(typeof data.risk.score).toBe('number');
      }

      // generatedAt should be a valid ISO string
      expect(typeof data.generatedAt).toBe('string');
      expect(new Date(data.generatedAt).toISOString()).toBe(data.generatedAt);
    });
  });
});
