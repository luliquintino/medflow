import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Finance E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test the full finance journey: summary, insights, profile update, simulation, and dashboard.
 *
 * To run: npx jest --roots="<rootDir>/src" --roots="<rootDir>/test" --testPathPatterns="finance.e2e" --transformIgnorePatterns="node_modules/(?!uuid)" --forceExit
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000); // E2E tests hit real DB — need longer timeout

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  // Store original profile values for cleanup
  let originalProfile: {
    minimumMonthlyGoal: number;
    idealMonthlyGoal: number;
    savingsGoal: number;
  };

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

    // Login with seed user (has financial profile, hospitals, and shifts)
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ana@demo.com', password: 'Demo1234!' })
      .expect(200);

    const data = res.body.data || res.body;
    accessToken = data.accessToken;
    expect(accessToken).toBeDefined();
  });

  afterAll(async () => {
    // Restore original profile if it was saved
    if (originalProfile && accessToken) {
      await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(originalProfile);
    }
    await app?.close();
  });

  // ─── GET /finance/summary ────────────────────────────

  describe('GET /api/v1/finance/summary', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .expect(401);
    });

    it('should return financial summary for current month', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Core financial fields
      expect(data).toHaveProperty('currentRevenue');
      expect(data).toHaveProperty('progressToMinimum');
      expect(data).toHaveProperty('progressToIdeal');
      expect(data).toHaveProperty('minimumShiftsRequired');
      expect(data).toHaveProperty('idealShiftsRequired');
      expect(data).toHaveProperty('revenueToMinimum');
      expect(data).toHaveProperty('revenueToIdeal');
      expect(data).toHaveProperty('isMinimumReached');
      expect(data).toHaveProperty('isIdealReached');

      // Revenue counts
      expect(data).toHaveProperty('confirmedShiftsCount');
      expect(data).toHaveProperty('simulatedShiftsCount');
      expect(data).toHaveProperty('confirmedRevenue');
      expect(data).toHaveProperty('simulatedRevenue');

      // Shifts array
      expect(data).toHaveProperty('shifts');
      expect(Array.isArray(data.shifts)).toBe(true);

      // Profile
      expect(data).toHaveProperty('profile');
      expect(data.profile).toHaveProperty('savingsGoal');
      expect(data.profile).toHaveProperty('averageShiftValue');
      expect(data.profile).toHaveProperty('minimumMonthlyGoal');
      expect(data.profile).toHaveProperty('idealMonthlyGoal');

      // Average shift value should be auto-calculated (> 0 for seed user with shifts)
      expect(typeof data.profile.averageShiftValue).toBe('number');
      expect(data.profile.averageShiftValue).toBeGreaterThan(0);

      // Month context
      expect(data).toHaveProperty('monthContext');
      expect(data.monthContext).toHaveProperty('month');
      expect(data.monthContext).toHaveProperty('year');
      expect(data.monthContext).toHaveProperty('isCurrent');
      expect(data.monthContext).toHaveProperty('isPast');
      expect(data.monthContext).toHaveProperty('isFuture');
      expect(data.monthContext.isCurrent).toBe(true);

      // Projections (current month should have projections)
      expect(data).toHaveProperty('projections');
      expect(data.projections).toHaveProperty('threeMonths');
      expect(data.projections).toHaveProperty('sixMonths');

      // Store original profile for cleanup
      originalProfile = {
        minimumMonthlyGoal: data.profile.minimumMonthlyGoal,
        idealMonthlyGoal: data.profile.idealMonthlyGoal,
        savingsGoal: data.profile.savingsGoal,
      };
    });

    it('should return summary for a specific past month', async () => {
      const now = new Date();
      const pastMonth = now.getMonth(); // previous month (0-indexed, so same as current - 1 for query)
      const pastYear = pastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const queryMonth = pastMonth === 0 ? 12 : pastMonth;

      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .query({ month: queryMonth, year: pastYear })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data.monthContext.month).toBe(queryMonth);
      expect(data.monthContext.year).toBe(pastYear);
      expect(data.monthContext.isPast).toBe(true);
      expect(data.monthContext.isCurrent).toBe(false);

      // Past months should have empty projections
      expect(data.projections.threeMonths).toHaveLength(0);
      expect(data.projections.sixMonths).toHaveLength(0);
    });

    it('should reject invalid month query param', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .query({ month: 13, year: 2026 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should have consistent revenue calculations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // currentRevenue should equal confirmedRevenue (for current month display)
      expect(data.currentRevenue).toBe(data.confirmedRevenue);

      // progressToMinimum should be consistent
      if (data.profile.minimumMonthlyGoal > 0) {
        const expectedProgress = Math.min(
          100,
          Math.round((data.currentRevenue / data.profile.minimumMonthlyGoal) * 100),
        );
        expect(data.progressToMinimum).toBe(expectedProgress);
      }

      // revenueToMinimum should be gap
      const expectedGap = Math.max(0, data.profile.minimumMonthlyGoal - data.currentRevenue);
      expect(data.revenueToMinimum).toBe(expectedGap);
    });
  });

  // ─── GET /finance/insights ───────────────────────────

  describe('GET /api/v1/finance/insights', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/insights')
        .expect(401);
    });

    it('should return insights array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ─── PATCH /finance/profile ──────────────────────────

  describe('PATCH /api/v1/finance/profile', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .send({ savingsGoal: 3000 })
        .expect(401);
    });

    it('should update financial goals', async () => {
      const updateDto = {
        minimumMonthlyGoal: 6000,
        idealMonthlyGoal: 9000,
        savingsGoal: 2500,
      };

      const res = await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data.minimumMonthlyGoal).toBe(6000);
      expect(data.idealMonthlyGoal).toBe(9000);
      expect(data.savingsGoal).toBe(2500);
    });

    it('should reflect updated goals in summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data.profile.minimumMonthlyGoal).toBe(6000);
      expect(data.profile.idealMonthlyGoal).toBe(9000);
      expect(data.profile.savingsGoal).toBe(2500);
      expect(data.minimumMonthlyGoal).toBe(6000);
      expect(data.idealMonthlyGoal).toBe(9000);
    });

    it('should allow partial updates', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ savingsGoal: 1500 })
        .expect(200);

      const data = res.body.data || res.body;

      // Only savingsGoal changed, others should remain from previous update
      expect(data.savingsGoal).toBe(1500);
      expect(data.minimumMonthlyGoal).toBe(6000);
      expect(data.idealMonthlyGoal).toBe(9000);
    });

    it('should reject negative values', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ savingsGoal: -100 })
        .expect(400);
    });

    it('should reject non-numeric values', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/finance/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ savingsGoal: 'abc' })
        .expect(400);
    });
  });

  // ─── POST /finance/simulate ──────────────────────────

  describe('POST /api/v1/finance/simulate', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/simulate')
        .send({ shiftValue: 1500 })
        .expect(401);
    });

    it('should simulate shift impact on finances', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/simulate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ shiftValue: 1500 })
        .expect(201);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('beforeRevenue');
      expect(data).toHaveProperty('afterRevenue');
      expect(data).toHaveProperty('revenueGain');
      expect(data).toHaveProperty('progressToMinimumBefore');
      expect(data).toHaveProperty('progressToMinimumAfter');
      expect(data).toHaveProperty('progressToIdealBefore');
      expect(data).toHaveProperty('progressToIdealAfter');
      expect(data).toHaveProperty('minimumReachedBefore');
      expect(data).toHaveProperty('minimumReachedAfter');
      expect(data).toHaveProperty('idealReachedBefore');
      expect(data).toHaveProperty('idealReachedAfter');
      expect(data).toHaveProperty('impactPercentage');

      // afterRevenue should be beforeRevenue + shiftValue
      expect(data.afterRevenue).toBe(data.beforeRevenue + 1500);
      expect(data.revenueGain).toBe(1500);

      // Progress should increase or stay the same
      expect(data.progressToMinimumAfter).toBeGreaterThanOrEqual(data.progressToMinimumBefore);
      expect(data.progressToIdealAfter).toBeGreaterThanOrEqual(data.progressToIdealBefore);
    });

    it('should reject missing shiftValue', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/simulate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject negative shiftValue', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/simulate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ shiftValue: -500 })
        .expect(400);
    });
  });

  // ─── GET /dashboard ──────────────────────────────────

  describe('GET /api/v1/dashboard', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .expect(401);
    });

    it('should return consolidated dashboard data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Dashboard should have all three sections
      expect(data).toHaveProperty('finance');
      expect(data).toHaveProperty('workload');
      expect(data).toHaveProperty('risk');

      // Finance section should contain the summary
      if (data.finance) {
        expect(data.finance).toHaveProperty('currentRevenue');
        expect(data.finance).toHaveProperty('profile');
        expect(data.finance.profile).toHaveProperty('averageShiftValue');
        expect(data.finance.profile.averageShiftValue).toBeGreaterThan(0);
      }

      // Workload section
      if (data.workload) {
        expect(data.workload).toHaveProperty('shiftsThisMonth');
        expect(data.workload).toHaveProperty('totalHoursThisMonth');
        expect(data.workload).toHaveProperty('totalHoursThisWeek');
      }

      // Risk section
      if (data.risk) {
        expect(data.risk).toHaveProperty('level');
        expect(data.risk).toHaveProperty('score');
        expect(['PILAR_SUSTENTAVEL', 'PILAR_CARGA_ELEVADA', 'PILAR_RISCO_FADIGA', 'PILAR_ALTO_RISCO']).toContain(data.risk.level);
      }
    });
  });

  // ─── Auto-calculated average shift value ─────────────

  describe('Auto-calculated averageShiftValue', () => {
    it('should calculate averageShiftValue from confirmed shifts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // The seed user (ana@demo.com) has confirmed shifts
      // Average should be auto-calculated, not the manual profile value
      expect(data.profile.averageShiftValue).toBeGreaterThan(0);
      expect(typeof data.profile.averageShiftValue).toBe('number');

      // Minimum shifts required should be based on auto-calculated average
      if (data.profile.minimumMonthlyGoal > 0 && data.profile.averageShiftValue > 0) {
        const expectedMinShifts = Math.ceil(
          data.profile.minimumMonthlyGoal / data.profile.averageShiftValue,
        );
        expect(data.minimumShiftsRequired).toBe(expectedMinShifts);
      }
    });

    it('should use auto-calculated average in simulation too', async () => {
      // Get current summary to know the average
      const summaryRes = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const summaryData = summaryRes.body.data || summaryRes.body;
      const avgValue = summaryData.profile.averageShiftValue;

      // Simulate with a shift value equal to the average
      const simRes = await request(app.getHttpServer())
        .post('/api/v1/finance/simulate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ shiftValue: avgValue })
        .expect(201);

      const simData = simRes.body.data || simRes.body;

      // The gain should exactly equal the average value
      expect(simData.revenueGain).toBe(avgValue);
      expect(simData.afterRevenue).toBe(simData.beforeRevenue + avgValue);
    });
  });
});
