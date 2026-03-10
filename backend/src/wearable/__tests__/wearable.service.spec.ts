import { Test, TestingModule } from '@nestjs/testing';
import { WearableService } from '../wearable.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

// Mock the wearable adapter factory
jest.mock('../wearable.adapter', () => {
  const mockAdapter = {
    getHRV: jest.fn(),
    getSleepData: jest.fn(),
    getRecoveryScore: jest.fn(),
  };
  return {
    createWearableAdapter: jest.fn(() => mockAdapter),
    __mockAdapter: mockAdapter,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockAdapter: mockAdapter } = require('../wearable.adapter');

describe('WearableService', () => {
  let service: WearableService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [WearableService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<WearableService>(WearableService);
    prisma = mockPrismaService;
  });

  describe('getLatestData', () => {
    it('should fetch latest wearable data and save to DB', async () => {
      const userId = 'user-1';
      const now = new Date();

      const hrvData = { value: 65, recordedAt: now, source: 'mock' };
      const sleepData = {
        totalHours: 7.5,
        score: 82,
        deepSleepHours: 1.8,
        remSleepHours: 2.0,
        awakenings: 2,
        recordedAt: now,
        source: 'mock',
      };
      const recoveryData = {
        score: 78,
        restingHR: 60,
        stressLevel: 35,
        recordedAt: now,
        source: 'mock',
      };

      mockAdapter.getHRV.mockResolvedValue(hrvData);
      mockAdapter.getSleepData.mockResolvedValue(sleepData);
      mockAdapter.getRecoveryScore.mockResolvedValue(recoveryData);
      prisma.wearableData.create.mockResolvedValue({ id: 'wd-1' });

      const result = await service.getLatestData(userId);

      expect(mockAdapter.getHRV).toHaveBeenCalledWith(userId);
      expect(mockAdapter.getSleepData).toHaveBeenCalledWith(userId);
      expect(mockAdapter.getRecoveryScore).toHaveBeenCalledWith(userId);
      expect(prisma.wearableData.create).toHaveBeenCalledWith({
        data: {
          userId,
          source: 'mock',
          recordedAt: now,
          hrv: 65,
          sleepScore: 82,
          sleepHours: 7.5,
          recoveryScore: 78,
          restingHR: 60,
          stressLevel: 35,
          rawData: { hrv: hrvData, sleep: sleepData, recovery: recoveryData },
        },
      });
      expect(result.hrv).toEqual(hrvData);
      expect(result.sleep).toEqual(sleepData);
      expect(result.recovery).toEqual(recoveryData);
      expect(result.interpretation).toBeDefined();
    });

    it('should return "great" interpretation for high scores', async () => {
      const userId = 'user-1';
      const now = new Date();

      mockAdapter.getHRV.mockResolvedValue({
        value: 75,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getSleepData.mockResolvedValue({
        totalHours: 8,
        score: 90,
        deepSleepHours: 2,
        remSleepHours: 2,
        awakenings: 1,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getRecoveryScore.mockResolvedValue({
        score: 90,
        restingHR: 55,
        stressLevel: 20,
        recordedAt: now,
        source: 'mock',
      });
      prisma.wearableData.create.mockResolvedValue({ id: 'wd-1' });

      const result = await service.getLatestData(userId);

      expect(result.interpretation.status).toBe('great');
    });

    it('should return "moderate" interpretation for moderate scores', async () => {
      const userId = 'user-1';
      const now = new Date();

      // avg = (45/75 + 55/100 + 55/100) / 3 = (0.6 + 0.55 + 0.55) / 3 ~ 0.567
      mockAdapter.getHRV.mockResolvedValue({
        value: 45,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getSleepData.mockResolvedValue({
        totalHours: 6,
        score: 55,
        deepSleepHours: 1,
        remSleepHours: 1.5,
        awakenings: 3,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getRecoveryScore.mockResolvedValue({
        score: 55,
        restingHR: 65,
        stressLevel: 50,
        recordedAt: now,
        source: 'mock',
      });
      prisma.wearableData.create.mockResolvedValue({ id: 'wd-1' });

      const result = await service.getLatestData(userId);

      expect(result.interpretation.status).toBe('moderate');
    });

    it('should return "low" interpretation for low scores', async () => {
      const userId = 'user-1';
      const now = new Date();

      // avg = (20/75 + 25/100 + 25/100) / 3 = (0.267 + 0.25 + 0.25) / 3 ~ 0.256
      mockAdapter.getHRV.mockResolvedValue({
        value: 20,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getSleepData.mockResolvedValue({
        totalHours: 4,
        score: 25,
        deepSleepHours: 0.5,
        remSleepHours: 0.5,
        awakenings: 6,
        recordedAt: now,
        source: 'mock',
      });
      mockAdapter.getRecoveryScore.mockResolvedValue({
        score: 25,
        restingHR: 80,
        stressLevel: 80,
        recordedAt: now,
        source: 'mock',
      });
      prisma.wearableData.create.mockResolvedValue({ id: 'wd-1' });

      const result = await service.getLatestData(userId);

      expect(result.interpretation.status).toBe('low');
    });
  });

  describe('getHistory', () => {
    it('should return wearable data history for default 7 days', async () => {
      const userId = 'user-1';
      const history = [
        { id: 'wd-1', userId, hrv: 65, sleepScore: 80, recordedAt: new Date() },
        { id: 'wd-2', userId, hrv: 55, sleepScore: 70, recordedAt: new Date() },
      ];

      prisma.wearableData.findMany.mockResolvedValue(history);

      const result = await service.getHistory(userId);

      expect(prisma.wearableData.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          recordedAt: { gte: expect.any(Date) },
        },
        orderBy: { recordedAt: 'desc' },
      });
      expect(result).toEqual(history);
      expect(result).toHaveLength(2);
    });

    it('should respect custom days parameter', async () => {
      const userId = 'user-1';

      prisma.wearableData.findMany.mockResolvedValue([]);

      await service.getHistory(userId, 30);

      expect(prisma.wearableData.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          recordedAt: { gte: expect.any(Date) },
        },
        orderBy: { recordedAt: 'desc' },
      });
    });

    it('should return empty array when no wearable data exists', async () => {
      const userId = 'user-1';

      prisma.wearableData.findMany.mockResolvedValue([]);

      const result = await service.getHistory(userId);

      expect(result).toEqual([]);
    });
  });
});
