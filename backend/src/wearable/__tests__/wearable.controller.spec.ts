import { Test, TestingModule } from '@nestjs/testing';
import { WearableController } from '../wearable.controller';
import { WearableService } from '../wearable.service';

const mockWearableService = {
  getLatestData: jest.fn(),
  getHistory: jest.fn(),
};

describe('WearableController', () => {
  let controller: WearableController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WearableController],
      providers: [{ provide: WearableService, useValue: mockWearableService }],
    }).compile();

    controller = module.get<WearableController>(WearableController);
  });

  // ─── GET LATEST ─────────────────────────────────────

  describe('getLatest', () => {
    it('should call wearableService.getLatestData with userId', async () => {
      const userId = 'user-1';
      const result = {
        heartRate: 72,
        steps: 8500,
        sleepHours: 7.2,
        timestamp: '2026-03-07T10:00:00Z',
      };
      mockWearableService.getLatestData.mockResolvedValue(result);

      expect(await controller.getLatest(userId)).toEqual(result);
      expect(mockWearableService.getLatestData).toHaveBeenCalledWith(userId);
    });
  });

  // ─── GET HISTORY ────────────────────────────────────

  describe('getHistory', () => {
    it('should call wearableService.getHistory with userId and default days', async () => {
      const userId = 'user-1';
      const result = [
        { date: '2026-03-06', heartRate: 70, steps: 9000, sleepHours: 7.5 },
        { date: '2026-03-07', heartRate: 72, steps: 8500, sleepHours: 7.2 },
      ];
      mockWearableService.getHistory.mockResolvedValue(result);

      expect(await controller.getHistory(userId, undefined)).toEqual(result);
      expect(mockWearableService.getHistory).toHaveBeenCalledWith(userId, 7);
    });

    it('should call wearableService.getHistory with userId and parsed days', async () => {
      const userId = 'user-1';
      const result = [{ date: '2026-03-07', heartRate: 72, steps: 8500, sleepHours: 7.2 }];
      mockWearableService.getHistory.mockResolvedValue(result);

      expect(await controller.getHistory(userId, '14')).toEqual(result);
      expect(mockWearableService.getHistory).toHaveBeenCalledWith(userId, 14);
    });
  });
});
