import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Hospitals E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test hospital CRUD and shift template CRUD within a hospital.
 *
 * To run: npx jest --config jest.config.ts test/hospitals.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Hospitals (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdHospitalId: string;
  let createdTemplateId: string;

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
    // Clean up created hospital (cascades to templates)
    if (createdHospitalId && accessToken) {
      await request(app.getHttpServer())
        .delete(`/api/v1/hospitals/${createdHospitalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .catch(() => {});
    }
    await app?.close();
  });

  // ─── Auth Guard ──────────────────────────────────

  describe('Authentication', () => {
    it('should reject GET /hospitals without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/hospitals')
        .expect(401);
    });

    it('should reject POST /hospitals without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .send({ name: 'Unauthorized Hospital' })
        .expect(401);
    });
  });

  // ─── POST /hospitals ─────────────────────────────

  describe('POST /api/v1/hospitals', () => {
    it('should create a hospital with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Hospital E2E Test',
          city: 'São Paulo',
          state: 'SP',
          notes: 'Created by E2E test',
          paymentDay: 15,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Hospital E2E Test');
      expect(data.city).toBe('São Paulo');
      expect(data.state).toBe('SP');
      expect(data.paymentDay).toBe(15);

      createdHospitalId = data.id;
    });

    it('should reject creation with name too short', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'H' })
        .expect(400);
    });

    it('should reject creation with missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ city: 'São Paulo' })
        .expect(400);
    });
  });

  // ─── GET /hospitals ──────────────────────────────

  describe('GET /api/v1/hospitals', () => {
    it('should list hospitals as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hospitals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  // ─── GET /hospitals/:id ──────────────────────────

  describe('GET /api/v1/hospitals/:id', () => {
    it('should return a single hospital by ID', async () => {
      expect(createdHospitalId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${createdHospitalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(createdHospitalId);
      expect(data.name).toBe('Hospital E2E Test');
    });

    it('should return 404 for non-existing hospital', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/hospitals/non-existing-id-123')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /hospitals/:id ────────────────────────

  describe('PATCH /api/v1/hospitals/:id', () => {
    it('should update an existing hospital', async () => {
      expect(createdHospitalId).toBeDefined();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/hospitals/${createdHospitalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Hospital E2E Updated', paymentDay: 25 })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.name).toBe('Hospital E2E Updated');
      expect(data.paymentDay).toBe(25);
    });
  });

  // ─── Shift Templates CRUD ───────────────────────

  describe('Shift Templates (nested under hospital)', () => {
    it('should reject template creation without token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/hospitals/${createdHospitalId}/templates`)
        .send({ type: 'DIURNO_12H', durationInHours: 12, defaultValue: 1400, isNightShift: false })
        .expect(401);
    });

    it('should create a shift template', async () => {
      expect(createdHospitalId).toBeDefined();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/hospitals/${createdHospitalId}/templates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Template E2E',
          type: 'DIURNO_12H',
          durationInHours: 12,
          defaultValue: 1400,
          isNightShift: false,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.type).toBe('DIURNO_12H');
      expect(data.durationInHours).toBe(12);
      expect(data.defaultValue).toBe(1400);
      expect(data.isNightShift).toBe(false);

      createdTemplateId = data.id;
    });

    it('should list templates for the hospital', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${createdHospitalId}/templates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should get a single template by ID', async () => {
      expect(createdTemplateId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${createdHospitalId}/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(createdTemplateId);
    });

    it('should update a template', async () => {
      expect(createdTemplateId).toBeDefined();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/hospitals/${createdHospitalId}/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ defaultValue: 1600, name: 'Template E2E Updated' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.defaultValue).toBe(1600);
    });

    it('should delete a template', async () => {
      expect(createdTemplateId).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/api/v1/hospitals/${createdHospitalId}/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${createdHospitalId}/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      createdTemplateId = undefined;
    });
  });

  // ─── DELETE /hospitals/:id ───────────────────────

  describe('DELETE /api/v1/hospitals/:id', () => {
    it('should delete an existing hospital', async () => {
      expect(createdHospitalId).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/api/v1/hospitals/${createdHospitalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${createdHospitalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      // Mark as cleaned up
      createdHospitalId = undefined;
    });
  });
});
