import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Shifts E2E Tests
 *
 * These tests require a running database connection with seed data.
 * They test CRUD operations, workload metrics, and workload simulation.
 *
 * To run: npx jest --config jest.config.ts test/shifts.e2e.spec.ts
 * Requires: DATABASE_URL environment variable + seed data (ana@demo.com)
 */
jest.setTimeout(15000);

describe('Shifts (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdShiftId: string;

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
    // Clean up created shift if it still exists
    if (createdShiftId && accessToken) {
      await request(app.getHttpServer())
        .delete(`/api/v1/shifts/${createdShiftId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .catch(() => {});
    }
    await app?.close();
  });

  // ─── Auth Guard ──────────────────────────────────

  describe('Authentication', () => {
    it('should reject GET /shifts without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shifts')
        .expect(401);
    });

    it('should reject POST /shifts without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts')
        .send({ date: '2026-04-01T08:00:00.000Z', type: 'TWELVE_DAY', hours: 12, value: 1500, location: 'Test' })
        .expect(401);
    });
  });

  // ─── GET /shifts ─────────────────────────────────

  describe('GET /api/v1/shifts', () => {
    it('should list shifts as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shifts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter shifts by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shifts')
        .query({ status: 'CONFIRMED' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      for (const shift of data) {
        expect(shift.status).toBe('CONFIRMED');
      }
    });
  });

  // ─── POST /shifts ────────────────────────────────

  describe('POST /api/v1/shifts', () => {
    it('should create a shift with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/shifts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: '2026-04-15T08:00:00.000Z',
          type: 'TWELVE_DAY',
          hours: 12,
          value: 1500,
          location: 'Hospital E2E Test',
          notes: 'E2E test shift',
          status: 'CONFIRMED',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.type).toBe('TWELVE_DAY');
      expect(data.hours).toBe(12);
      expect(data.value).toBe(1500);
      expect(data.location).toBe('Hospital E2E Test');

      createdShiftId = data.id;
    });

    it('should reject creation with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ date: '2026-04-15T08:00:00.000Z' })
        .expect(400);
    });

    it('should reject creation with invalid ShiftType', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: '2026-04-15T08:00:00.000Z',
          type: 'INVALID_TYPE',
          hours: 12,
          value: 1500,
          location: 'Test',
        })
        .expect(400);
    });
  });

  // ─── GET /shifts/:id ─────────────────────────────

  describe('GET /api/v1/shifts/:id', () => {
    it('should return a single shift by ID', async () => {
      expect(createdShiftId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/shifts/${createdShiftId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(createdShiftId);
      expect(data.location).toBe('Hospital E2E Test');
    });

    it('should return 404 for non-existing shift', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shifts/non-existing-id-123')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /shifts/:id ───────────────────────────

  describe('PATCH /api/v1/shifts/:id', () => {
    it('should update an existing shift', async () => {
      expect(createdShiftId).toBeDefined();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/shifts/${createdShiftId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 2000, notes: 'Updated by E2E' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.value).toBe(2000);
      expect(data.notes).toBe('Updated by E2E');
    });
  });

  // ─── GET /shifts/workload ────────────────────────

  describe('GET /api/v1/shifts/workload', () => {
    it('should return workload summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shifts/workload')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;

      expect(data).toHaveProperty('shiftsThisMonth');
      expect(data).toHaveProperty('totalHoursThisMonth');
      expect(data).toHaveProperty('totalHoursThisWeek');
      expect(typeof data.shiftsThisMonth).toBe('number');
      expect(typeof data.totalHoursThisMonth).toBe('number');
      expect(typeof data.totalHoursThisWeek).toBe('number');
    });
  });

  // ─── POST /shifts/simulate-workload ──────────────

  describe('POST /api/v1/shifts/simulate-workload', () => {
    it('should simulate workload with hypothetical shift', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/shifts/simulate-workload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          date: '2026-04-20T08:00:00.000Z',
          type: 'TWENTY_FOUR',
          hours: 24,
          value: 3000,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });
  });

  // ─── DELETE /shifts/:id ──────────────────────────

  describe('DELETE /api/v1/shifts/:id', () => {
    it('should delete an existing shift', async () => {
      expect(createdShiftId).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/api/v1/shifts/${createdShiftId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/shifts/${createdShiftId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      // Mark as cleaned up
      createdShiftId = undefined;
    });
  });
});
