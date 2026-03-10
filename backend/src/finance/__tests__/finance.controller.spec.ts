import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from '../finance.controller';
import { FinanceService } from '../finance.service';

const mockFinanceService = {
  getSummary: jest.fn(),
  getInsights: jest.fn(),
  updateProfile: jest.fn(),
  simulate: jest.fn(),
};

describe('FinanceController', () => {
  let controller: FinanceController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: mockFinanceService }],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  // ─── GET SUMMARY ───────────────────────────────────

  describe('getSummary', () => {
    it('should call financeService.getSummary with userId, month, and year', async () => {
      const userId = 'user-1';
      const query = { month: 3, year: 2026 };
      const result = { totalIncome: 50000, totalExpenses: 20000 };
      mockFinanceService.getSummary.mockResolvedValue(result);

      expect(await controller.getSummary(userId, query as any)).toEqual(result);
      expect(mockFinanceService.getSummary).toHaveBeenCalledWith(userId, 3, 2026);
    });

    it('should handle query without month/year (defaults)', async () => {
      const userId = 'user-1';
      const query = {};
      const result = { totalIncome: 0, totalExpenses: 0 };
      mockFinanceService.getSummary.mockResolvedValue(result);

      expect(await controller.getSummary(userId, query as any)).toEqual(result);
      expect(mockFinanceService.getSummary).toHaveBeenCalledWith(userId, undefined, undefined);
    });
  });

  // ─── GET INSIGHTS ──────────────────────────────────

  describe('getInsights', () => {
    it('should call financeService.getInsights with userId', async () => {
      const userId = 'user-1';
      const result = { insights: ['Optimize shift schedule'] };
      mockFinanceService.getInsights.mockResolvedValue(result);

      expect(await controller.getInsights(userId)).toEqual(result);
      expect(mockFinanceService.getInsights).toHaveBeenCalledWith(userId);
    });
  });

  // ─── UPDATE PROFILE ────────────────────────────────

  describe('updateProfile', () => {
    it('should call financeService.updateProfile with userId and dto', async () => {
      const userId = 'user-1';
      const dto = { monthlyFixedCosts: 15000, savingsGoal: 5000 };
      const result = { id: userId, ...dto };
      mockFinanceService.updateProfile.mockResolvedValue(result);

      expect(await controller.updateProfile(userId, dto as any)).toEqual(result);
      expect(mockFinanceService.updateProfile).toHaveBeenCalledWith(userId, dto);
    });
  });

  // ─── SIMULATE ──────────────────────────────────────

  describe('simulate', () => {
    it('should call financeService.simulate with userId and dto', async () => {
      const userId = 'user-1';
      const dto = { date: '2026-04-01', type: 'PLANTAO_12', hours: 12, value: 3000 };
      const result = { projectedIncome: 53000 };
      mockFinanceService.simulate.mockResolvedValue(result);

      expect(await controller.simulate(userId, dto as any)).toEqual(result);
      expect(mockFinanceService.simulate).toHaveBeenCalledWith(userId, dto);
    });
  });
});
