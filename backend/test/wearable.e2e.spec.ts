import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Wearable E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test wearable data endpoints: latest readings and history.
 * The wearable adapter currently uses mock data.
 *
 * To run: npx jest --config jest.config.ts test/wearable.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Wearable (e2e)', () => {
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

  // ─── GET /wearable/latest ─────────────────────────────

  describe('GET /api/v1/wearable/latest', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wearable/latest')
        .expect(401);
    });

    it('should return latest wearable data with hrv, sleep, recovery, and interpretation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wearable/latest')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      // HRV data
      expect(data).toHaveProperty('hrv');
      expect(data.hrv).toHaveProperty('value');
      expect(data.hrv).toHaveProperty('recordedAt');
      expect(data.hrv).toHaveProperty('source');
      expect(typeof data.hrv.value).toBe('number');

      // Sleep data
      expect(data).toHaveProperty('sleep');
      expect(data.sleep).toHaveProperty('totalHours');
      expect(data.sleep).toHaveProperty('score');
      expect(data.sleep).toHaveProperty('deepSleepHours');
      expect(data.sleep).toHaveProperty('remSleepHours');
      expect(data.sleep).toHaveProperty('awakenings');
      expect(typeof data.sleep.score).toBe('number');

      // Recovery data
      expect(data).toHaveProperty('recovery');
      expect(data.recovery).toHaveProperty('score');
      expect(data.recovery).toHaveProperty('restingHR');
      expect(data.recovery).toHaveProperty('stressLevel');
      expect(typeof data.recovery.score).toBe('number');

      // Interpretation
      expect(data).toHaveProperty('interpretation');
      expect(data.interpretation).toHaveProperty('status');
      expect(data.interpretation).toHaveProperty('message');
      expect(['great', 'moderate', 'low']).toContain(data.interpretation.status);
    });
  });

  // ─── GET /wearable/history ────────────────────────────

  describe('GET /api/v1/wearable/history', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wearable/history')
        .expect(401);
    });

    it('should return history as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wearable/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should accept days query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wearable/history')
        .query({ days: 3 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
