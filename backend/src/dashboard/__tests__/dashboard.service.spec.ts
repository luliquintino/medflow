import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { FinanceService } from '../../finance/finance.service';
import { ShiftsService } from '../../shifts/shifts.service';
import { RiskEngineService } from '../../risk-engine/risk-engine.service';

const mockFinanceService = {
  getSummary: jest.fn(),
};

const mockShiftsService = {
  getWorkloadSummary: jest.fn(),
};

const mockRiskEngineService = {
  evaluate: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: FinanceService, useValue: mockFinanceService },
        { provide: ShiftsService, useValue: mockShiftsService },
        { provide: RiskEngineService, useValue: mockRiskEngineService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getDashboard', () => {
    it('should return consolidated dashboard data when all services succeed', async () => {
      const userId = 'user-1';
      const financeSummary = {
        totalRevenue: 15000,
        totalExpenses: 5000,
        netIncome: 10000,
      };
      const workloadSummary = {
        totalHoursThisWeek: 36,
        totalHoursThisMonth: 120,
        shiftsThisMonth: 10,
      };
      const riskResult = {
        level: 'PILAR_SUSTENTAVEL',
        score: 15,
        triggeredRules: [],
        recommendation: 'Continue assim.',
      };

      mockFinanceService.getSummary.mockResolvedValue(financeSummary);
      mockShiftsService.getWorkloadSummary.mockResolvedValue(workloadSummary);
      mockRiskEngineService.evaluate.mockResolvedValue(riskResult);

      const result = await service.getDashboard(userId);

      expect(mockFinanceService.getSummary).toHaveBeenCalledWith(userId);
      expect(mockShiftsService.getWorkloadSummary).toHaveBeenCalledWith(userId);
      expect(mockRiskEngineService.evaluate).toHaveBeenCalledWith(userId);
      expect(result.finance).toEqual(financeSummary);
      expect(result.workload).toEqual(workloadSummary);
      expect(result.risk).toEqual(riskResult);
      expect(result.generatedAt).toBeDefined();
    });

    it('should return null for finance when finance service fails', async () => {
      const userId = 'user-1';

      mockFinanceService.getSummary.mockRejectedValue(new Error('No financial profile'));
      mockShiftsService.getWorkloadSummary.mockResolvedValue({
        totalHoursThisWeek: 0,
      });
      mockRiskEngineService.evaluate.mockResolvedValue({
        level: 'PILAR_SUSTENTAVEL',
        score: 0,
      });

      const result = await service.getDashboard(userId);

      expect(result.finance).toBeNull();
      expect(result.workload).toEqual({ totalHoursThisWeek: 0 });
      expect(result.risk).toEqual({ level: 'PILAR_SUSTENTAVEL', score: 0 });
    });

    it('should return null for workload when shifts service fails', async () => {
      const userId = 'user-1';

      mockFinanceService.getSummary.mockResolvedValue({ totalRevenue: 5000 });
      mockShiftsService.getWorkloadSummary.mockRejectedValue(new Error('No shifts found'));
      mockRiskEngineService.evaluate.mockResolvedValue({
        level: 'PILAR_SUSTENTAVEL',
        score: 0,
      });

      const result = await service.getDashboard(userId);

      expect(result.finance).toEqual({ totalRevenue: 5000 });
      expect(result.workload).toBeNull();
      expect(result.risk).toEqual({ level: 'PILAR_SUSTENTAVEL', score: 0 });
    });

    it('should return null for risk when risk engine fails', async () => {
      const userId = 'user-1';

      mockFinanceService.getSummary.mockResolvedValue({ totalRevenue: 5000 });
      mockShiftsService.getWorkloadSummary.mockResolvedValue({
        totalHoursThisWeek: 36,
      });
      mockRiskEngineService.evaluate.mockRejectedValue(new Error('Risk evaluation error'));

      const result = await service.getDashboard(userId);

      expect(result.finance).toEqual({ totalRevenue: 5000 });
      expect(result.workload).toEqual({ totalHoursThisWeek: 36 });
      expect(result.risk).toBeNull();
    });

    it('should return all nulls when all services fail', async () => {
      const userId = 'user-1';

      mockFinanceService.getSummary.mockRejectedValue(new Error('fail'));
      mockShiftsService.getWorkloadSummary.mockRejectedValue(new Error('fail'));
      mockRiskEngineService.evaluate.mockRejectedValue(new Error('fail'));

      const result = await service.getDashboard(userId);

      expect(result.finance).toBeNull();
      expect(result.workload).toBeNull();
      expect(result.risk).toBeNull();
      expect(result.generatedAt).toBeDefined();
    });

    it('should include generatedAt ISO string timestamp', async () => {
      const userId = 'user-1';

      mockFinanceService.getSummary.mockResolvedValue({});
      mockShiftsService.getWorkloadSummary.mockResolvedValue({});
      mockRiskEngineService.evaluate.mockResolvedValue({});

      const before = new Date().toISOString();
      const result = await service.getDashboard(userId);
      const after = new Date().toISOString();

      expect(result.generatedAt).toBeDefined();
      expect(result.generatedAt >= before).toBe(true);
      expect(result.generatedAt <= after).toBe(true);
    });
  });
});
