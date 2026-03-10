import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsService } from '../analytics.service';

const mockAnalyticsService = {
  getAnalytics: jest.fn(),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('getAnalytics', () => {
    const mockResult = {
      summary: { totalRevenue: 50000, totalShifts: 10, avgPerShift: 5000 },
      monthlyIncome: [],
      hospitalRanking: [],
      incomeByShiftType: [],
      monthOverMonthGrowth: [],
    };

    it('should call analyticsService.getAnalytics with userId and default monthsBack', async () => {
      mockAnalyticsService.getAnalytics.mockResolvedValue(mockResult);

      const result = await controller.getAnalytics('user-1', {} as any);

      expect(result).toEqual(mockResult);
      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith('user-1', 6);
    });

    it('should pass explicit monthsBack from query', async () => {
      mockAnalyticsService.getAnalytics.mockResolvedValue(mockResult);

      const result = await controller.getAnalytics('user-1', { monthsBack: 12 } as any);

      expect(result).toEqual(mockResult);
      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith('user-1', 12);
    });

    it('should return the result from the service unchanged', async () => {
      const specificResult = { ...mockResult, summary: { totalRevenue: 99999 } };
      mockAnalyticsService.getAnalytics.mockResolvedValue(specificResult);

      const result = await controller.getAnalytics('user-2', { monthsBack: 3 } as any);

      expect(result).toBe(specificResult);
    });
  });
});
