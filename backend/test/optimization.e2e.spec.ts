import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Optimization E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test the shift optimization endpoints: suggest scenarios and apply shifts.
 *
 * To run: npx jest --config jest.config.ts test/optimization.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Optimization (e2e)', () => {
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

  // ─── GET /optimization/suggest ────────────────────────

  describe('GET /api/v1/optimization/suggest', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/optimization/suggest')
        .expect(401);
    });

    it('should return optimization suggestions with financial context', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/optimization/suggest')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // Financial context
      expect(data).toHaveProperty('financialGap');
      expect(data).toHaveProperty('currentRevenue');
      expect(data).toHaveProperty('targetRevenue');
      expect(data).toHaveProperty('gapPercentage');
      expect(data).toHaveProperty('isGoalAlreadyMet');

      expect(typeof data.financialGap).toBe('number');
      expect(typeof data.currentRevenue).toBe('number');
      expect(typeof data.targetRevenue).toBe('number');
      expect(typeof data.gapPercentage).toBe('number');
      expect(typeof data.isGoalAlreadyMet).toBe('boolean');

      // Suggested scenarios array
      expect(data).toHaveProperty('suggestedScenarios');
      expect(Array.isArray(data.suggestedScenarios)).toBe(true);

      // If scenarios exist, validate their shape
      if (data.suggestedScenarios.length > 0) {
        const scenario = data.suggestedScenarios[0];
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('shifts');
        expect(scenario).toHaveProperty('totalShifts');
        expect(scenario).toHaveProperty('totalHours');
        expect(scenario).toHaveProperty('totalIncome');
        expect(scenario).toHaveProperty('totalExhaustion');
        expect(scenario).toHaveProperty('sustainabilityIndex');
        expect(scenario).toHaveProperty('riskLevel');
        expect(scenario).toHaveProperty('optimizationScore');
        expect(['PILAR_SUSTENTAVEL', 'PILAR_CARGA_ELEVADA', 'PILAR_RISCO_FADIGA', 'PILAR_ALTO_RISCO']).toContain(scenario.riskLevel);
        expect(Array.isArray(scenario.shifts)).toBe(true);
      }
    });
  });

  // ─── POST /optimization/apply ─────────────────────────

  describe('POST /api/v1/optimization/apply', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimization/apply')
        .send({ shifts: [] })
        .expect(401);
    });

    it('should reject invalid body (missing shifts array)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimization/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject shifts with invalid shape', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimization/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shifts: [{ invalidField: 'not-a-template' }],
        })
        .expect(400);
    });

    it('should return 404 for non-existent template ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimization/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shifts: [
            {
              templateId: '00000000-0000-0000-0000-000000000000',
              date: new Date().toISOString(),
            },
          ],
        })
        .expect(404);
    });
  });
});
