import { Test, TestingModule } from '@nestjs/testing';
import { RiskEngineService } from '../risk-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('RiskEngineService', () => {
  let service: RiskEngineService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskEngineService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<RiskEngineService>(RiskEngineService);
    prisma = mockPrismaService;
  });

  describe('evaluate', () => {
    it('should evaluate risk for user with shifts and work profile', async () => {
      const userId = 'user-1';
      const now = new Date();
      const shifts = [
        {
          id: 'shift-1',
          userId,
          date: new Date(now.getTime() - 2 * 24 * 3600000),
          endDate: new Date(now.getTime() - 2 * 24 * 3600000 + 12 * 3600000),
          type: 'TWELVE_DAY',
          hours: 12,
          value: 1500,
          location: 'Hospital A',
          status: 'CONFIRMED',
        },
      ];
      const workProfile = {
        userId,
        maxWeeklyHours: 60,
        energyCostDiurno: 1.0,
        energyCostNoturno: 1.5,
        energyCost24h: 2.5,
      };

      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.workProfile.findUnique.mockResolvedValue(workProfile);
      prisma.riskHistory.create.mockResolvedValue({ id: 'risk-1' });

      const result = await service.evaluate(userId);

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'CONFIRMED' },
        orderBy: { date: 'asc' },
      });
      expect(prisma.workProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prisma.riskHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          riskLevel: expect.any(String),
          riskScore: expect.any(Number),
        }),
      });
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('triggeredRules');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('workload');
    });

    it('should return SAFE risk level for low workload', async () => {
      const userId = 'user-1';
      const now = new Date();
      const shifts = [
        {
          id: 'shift-1',
          userId,
          date: new Date(now.getTime() - 5 * 24 * 3600000),
          endDate: new Date(now.getTime() - 5 * 24 * 3600000 + 12 * 3600000),
          type: 'TWELVE_DAY',
          hours: 12,
          value: 1500,
          location: 'Hospital A',
          status: 'CONFIRMED',
        },
      ];

      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.workProfile.findUnique.mockResolvedValue(null);
      prisma.riskHistory.create.mockResolvedValue({ id: 'risk-1' });

      const result = await service.evaluate(userId);

      expect(result.level).toBe('SAFE');
    });

    it('should handle no shifts (empty array)', async () => {
      const userId = 'user-1';

      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(null);
      prisma.riskHistory.create.mockResolvedValue({ id: 'risk-1' });

      const result = await service.evaluate(userId);

      expect(result.level).toBe('SAFE');
      expect(result.score).toBe(0);
      expect(result.triggeredRules).toEqual([]);
      expect(result.workload).toBeDefined();
    });

    it('should handle no work profile (use defaults)', async () => {
      const userId = 'user-1';

      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(null);
      prisma.riskHistory.create.mockResolvedValue({ id: 'risk-1' });

      const result = await service.evaluate(userId);

      expect(prisma.workProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toBeDefined();
      expect(result.level).toBe('SAFE');
    });

    it('should persist risk history after evaluation', async () => {
      const userId = 'user-1';

      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(null);
      prisma.riskHistory.create.mockResolvedValue({ id: 'risk-1' });

      await service.evaluate(userId);

      expect(prisma.riskHistory.create).toHaveBeenCalledTimes(1);
      expect(prisma.riskHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          riskLevel: 'SAFE',
          riskScore: 0,
          triggerRules: [],
          recommendation: expect.any(String),
          periodStart: expect.any(Date),
          periodEnd: expect.any(Date),
          hoursIn5Days: 0,
          hoursInWeek: 0,
          consecutiveNights: 0,
        }),
      });
    });
  });

  describe('simulateWithShift', () => {
    it('should simulate risk with a hypothetical shift', async () => {
      const userId = 'user-1';
      const now = new Date();
      const shifts = [
        {
          id: 'shift-1',
          userId,
          date: new Date(now.getTime() - 1 * 24 * 3600000),
          endDate: new Date(now.getTime() - 1 * 24 * 3600000 + 12 * 3600000),
          type: 'TWELVE_DAY',
          hours: 12,
          value: 1500,
          location: 'Hospital A',
          status: 'CONFIRMED',
        },
      ];

      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.workProfile.findUnique.mockResolvedValue(null);

      const hypothetical = {
        date: new Date(now.getTime() + 1 * 24 * 3600000).toISOString(),
        type: 'TWELVE_DAY' as const,
        hours: 12,
      };

      const result = await service.simulateWithShift(userId, hypothetical);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('workload');
      expect(prisma.riskHistory.create).not.toHaveBeenCalled();
    });

    it('should simulate with no existing shifts', async () => {
      const userId = 'user-1';
      const now = new Date();

      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(null);

      const hypothetical = {
        date: new Date(now.getTime() + 1 * 24 * 3600000).toISOString(),
        type: 'TWELVE_NIGHT' as const,
        hours: 12,
      };

      const result = await service.simulateWithShift(userId, hypothetical);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result.workload).toBeDefined();
    });

    it('should use work profile energy costs when available', async () => {
      const userId = 'user-1';
      const now = new Date();
      const workProfile = {
        userId,
        maxWeeklyHours: 60,
        energyCostDiurno: 1.2,
        energyCostNoturno: 1.8,
        energyCost24h: 3.0,
      };

      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(workProfile);

      const hypothetical = {
        date: new Date(now.getTime() + 1 * 24 * 3600000).toISOString(),
        type: 'TWENTY_FOUR' as const,
        hours: 24,
      };

      const result = await service.simulateWithShift(userId, hypothetical);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
    });
  });

  describe('getHistory', () => {
    it('should return risk history for user', async () => {
      const userId = 'user-1';
      const history = [
        {
          id: 'rh-1',
          userId,
          riskLevel: 'SAFE',
          riskScore: 10,
          createdAt: new Date(),
        },
        {
          id: 'rh-2',
          userId,
          riskLevel: 'MODERATE',
          riskScore: 45,
          createdAt: new Date(),
        },
      ];

      prisma.riskHistory.findMany.mockResolvedValue(history);

      const result = await service.getHistory(userId);

      expect(prisma.riskHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      expect(result).toEqual(history);
      expect(result).toHaveLength(2);
    });

    it('should respect custom limit parameter', async () => {
      const userId = 'user-1';

      prisma.riskHistory.findMany.mockResolvedValue([]);

      await service.getHistory(userId, 10);

      expect(prisma.riskHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when no history exists', async () => {
      const userId = 'user-1';

      prisma.riskHistory.findMany.mockResolvedValue([]);

      const result = await service.getHistory(userId);

      expect(result).toEqual([]);
    });
  });
});
