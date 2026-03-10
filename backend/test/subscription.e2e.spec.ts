import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Subscription E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test the subscription query endpoint.
 *
 * To run: npx jest --config jest.config.ts test/subscription.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Subscription (e2e)', () => {
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

  // ─── GET /subscription ────────────────────────────────

  describe('GET /api/v1/subscription', () => {
    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/subscription')
        .expect(401);
    });

    it('should return subscription with plan and status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('plan');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');

      // Plan should be one of the valid enum values
      expect(['ESSENTIAL', 'PRO']).toContain(data.plan);

      // Status should be one of the valid enum values
      expect(['ACTIVE', 'INACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED']).toContain(data.status);
    });
  });
});
