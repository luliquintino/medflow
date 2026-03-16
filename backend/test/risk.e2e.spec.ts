import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Risk Engine E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test risk evaluation, simulation, and history retrieval.
 *
 * To run: npx jest --config jest.config.ts test/risk.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Risk Engine (e2e)', () => {
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
    it('should reject GET /risk/evaluate without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/risk/evaluate')
        .expect(401);
    });
  });

  // ─── GET /risk/evaluate ──────────────────────────

  describe('GET /api/v1/risk/evaluate', () => {
    it('should return risk evaluation with level, score, and recommendation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/risk/evaluate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('level');
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('recommendation');
      expect(['PILAR_SUSTENTAVEL', 'PILAR_CARGA_ELEVADA', 'PILAR_RISCO_FADIGA', 'PILAR_ALTO_RISCO']).toContain(data.level);
      expect(typeof data.score).toBe('number');
      expect(typeof data.recommendation).toBe('string');

      // Should include FRMS insights and evidence
      expect(data).toHaveProperty('insights');
      expect(data).toHaveProperty('evidence');

      // Should also include workload metrics
      expect(data).toHaveProperty('workload');
      expect(data.workload).toHaveProperty('totalHoursThisWeek');
      expect(data.workload).toHaveProperty('totalHoursThisMonth');
    });
  });

  // ─── POST /risk/simulate ─────────────────────────

  describe('POST /api/v1/risk/simulate', () => {
    it('should simulate risk with a hypothetical shift', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/risk/simulate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: '2026-04-01T08:00:00.000Z',
          type: 'TWENTY_FOUR',
          hours: 24,
        })
        .expect(201);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('level');
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('recommendation');
      expect(['PILAR_SUSTENTAVEL', 'PILAR_CARGA_ELEVADA', 'PILAR_RISCO_FADIGA', 'PILAR_ALTO_RISCO']).toContain(data.level);
      expect(typeof data.score).toBe('number');

      // Should include FRMS insights and evidence
      expect(data).toHaveProperty('insights');
      expect(data).toHaveProperty('evidence');

      // Should include workload with the hypothetical shift factored in
      expect(data).toHaveProperty('workload');
    });

    it('should reject simulation without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/risk/simulate')
        .send({
          date: '2026-04-01T08:00:00.000Z',
          type: 'TWENTY_FOUR',
          hours: 24,
        })
        .expect(401);
    });
  });

  // ─── GET /risk/history ───────────────────────────

  describe('GET /api/v1/risk/history', () => {
    it('should return risk history as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/risk/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);

      // After the evaluate call above, there should be at least one entry
      if (data.length > 0) {
        const entry = data[0];
        expect(entry).toHaveProperty('riskLevel');
        expect(entry).toHaveProperty('riskScore');
        expect(entry).toHaveProperty('recommendation');
        expect(entry).toHaveProperty('createdAt');
      }
    });

    it('should respect the limit query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/risk/history')
        .query({ limit: '1' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(1);
    });
  });
});
