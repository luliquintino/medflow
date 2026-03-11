import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  // ─── HEALTH CHECK ──────────────────────────────────

  describe('check', () => {
    it('should return status ok with DB connected', async () => {
      const result = await controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(result).toHaveProperty('uptime');
      expect(result.db.connected).toBe(true);
      expect(result.db.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return status degraded when DB fails', async () => {
      mockPrismaService.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB down'));

      const result = await controller.check();

      expect(result).toHaveProperty('status', 'degraded');
      expect(result.db.connected).toBe(false);
    });
  });
});
