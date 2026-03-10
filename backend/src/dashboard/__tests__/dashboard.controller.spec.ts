import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';

const mockDashboardService = {
  getDashboard: jest.fn(),
};

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  // ─── GET DASHBOARD ─────────────────────────────────

  describe('getDashboard', () => {
    it('should call dashboardService.getDashboard with userId', async () => {
      const userId = 'user-1';
      const result = {
        shiftsThisMonth: 8,
        hoursThisMonth: 96,
        incomeThisMonth: 24000,
        riskScore: 35,
      };
      mockDashboardService.getDashboard.mockResolvedValue(result);

      expect(await controller.getDashboard(userId)).toEqual(result);
      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith(userId);
    });

    it('should return empty dashboard for new user', async () => {
      const userId = 'user-new';
      const result = {
        shiftsThisMonth: 0,
        hoursThisMonth: 0,
        incomeThisMonth: 0,
        riskScore: 0,
      };
      mockDashboardService.getDashboard.mockResolvedValue(result);

      expect(await controller.getDashboard(userId)).toEqual(result);
      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith(userId);
    });
  });
});
