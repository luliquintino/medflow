import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Analytics E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test analytics data retrieval with default and explicit monthsBack.
 *
 * To run: npx jest --config jest.config.ts test/analytics.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Analytics (e2e)', () => {
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

  // ─── Auth Guard ──────────────────────────────────

  describe('Authentication', () => {
    it('should reject GET /analytics without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .expect(401);
    });
  });

  // ─── GET /analytics ──────────────────────────────

  describe('GET /api/v1/analytics', () => {
    it('should return analytics with default monthsBack (6)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Verify top-level shape
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('monthlyIncome');
      expect(data).toHaveProperty('hospitalRanking');
      expect(data).toHaveProperty('incomeByShiftType');
      expect(data).toHaveProperty('monthOverMonthGrowth');

      // monthlyIncome should be an array with monthsBack + 1 entries (6 + current = 7)
      expect(Array.isArray(data.monthlyIncome)).toBe(true);
      expect(data.monthlyIncome.length).toBe(7);

      // Each monthly entry should have the expected shape
      if (data.monthlyIncome.length > 0) {
        const entry = data.monthlyIncome[0];
        expect(entry).toHaveProperty('label');
        expect(entry).toHaveProperty('year');
        expect(entry).toHaveProperty('month');
        expect(entry).toHaveProperty('revenue');
        expect(entry).toHaveProperty('shiftCount');
        expect(entry).toHaveProperty('totalHours');
      }

      // Summary shape
      expect(data.summary).toHaveProperty('totalRevenue');
      expect(data.summary).toHaveProperty('totalShifts');
      expect(data.summary).toHaveProperty('totalHours');
      expect(data.summary).toHaveProperty('avgPerShift');
      expect(data.summary).toHaveProperty('avgPerHour');
      expect(data.summary).toHaveProperty('overallGrowthPercent');

      // Arrays
      expect(Array.isArray(data.hospitalRanking)).toBe(true);
      expect(Array.isArray(data.incomeByShiftType)).toBe(true);
      expect(Array.isArray(data.monthOverMonthGrowth)).toBe(true);
    });

    it('should return analytics with explicit monthsBack=12', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .query({ monthsBack: 12 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('monthlyIncome');

      // monthlyIncome should have 13 entries (12 past months + current)
      expect(Array.isArray(data.monthlyIncome)).toBe(true);
      expect(data.monthlyIncome.length).toBe(13);
    });

    it('should have correct response shape for hospital ranking', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // hospitalRanking entries (if any) should have the expected shape
      if (data.hospitalRanking.length > 0) {
        const hospital = data.hospitalRanking[0];
        expect(hospital).toHaveProperty('hospitalId');
        expect(hospital).toHaveProperty('hospitalName');
        expect(hospital).toHaveProperty('totalRevenue');
        expect(hospital).toHaveProperty('avgPerShift');
        expect(hospital).toHaveProperty('shiftCount');
        expect(hospital).toHaveProperty('totalHours');
        expect(hospital).toHaveProperty('revenueShare');
      }

      // incomeByShiftType entries (if any)
      if (data.incomeByShiftType.length > 0) {
        const shiftType = data.incomeByShiftType[0];
        expect(shiftType).toHaveProperty('type');
        expect(shiftType).toHaveProperty('typeLabel');
        expect(shiftType).toHaveProperty('totalRevenue');
        expect(shiftType).toHaveProperty('shiftCount');
        expect(shiftType).toHaveProperty('avgPerShift');
        expect(shiftType).toHaveProperty('avgPerHour');
      }

      // monthOverMonthGrowth entries (if any)
      if (data.monthOverMonthGrowth.length > 0) {
        const growth = data.monthOverMonthGrowth[0];
        expect(growth).toHaveProperty('label');
        expect(growth).toHaveProperty('growthPercent');
      }
    });

    it('should reject invalid monthsBack values', async () => {
      // monthsBack must be between 3 and 12
      await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .query({ monthsBack: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
