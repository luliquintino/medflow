import { Test, TestingModule } from '@nestjs/testing';
import { RiskEngineController } from '../risk-engine.controller';
import { RiskEngineService } from '../risk-engine.service';

const mockRiskEngineService = {
  evaluate: jest.fn(),
  simulateWithShift: jest.fn(),
  getHistory: jest.fn(),
};

describe('RiskEngineController', () => {
  let controller: RiskEngineController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskEngineController],
      providers: [{ provide: RiskEngineService, useValue: mockRiskEngineService }],
    }).compile();

    controller = module.get<RiskEngineController>(RiskEngineController);
  });

  // ─── EVALUATE ───────────────────────────────────────

  describe('evaluate', () => {
    it('should call riskService.evaluate with userId', async () => {
      const userId = 'user-1';
      const result = { score: 42, level: 'PILAR_CARGA_ELEVADA', factors: [] };
      mockRiskEngineService.evaluate.mockResolvedValue(result);

      expect(await controller.evaluate(userId)).toEqual(result);
      expect(mockRiskEngineService.evaluate).toHaveBeenCalledWith(userId);
    });
  });

  // ─── SIMULATE ──────────────────────────────────────

  describe('simulate', () => {
    it('should call riskService.simulateWithShift with userId and body', async () => {
      const userId = 'user-1';
      const body = { date: '2026-04-01', type: 'PLANTAO_12' as any, hours: 12 };
      const result = { currentScore: 42, projectedScore: 55 };
      mockRiskEngineService.simulateWithShift.mockResolvedValue(result);

      expect(await controller.simulate(userId, body)).toEqual(result);
      expect(mockRiskEngineService.simulateWithShift).toHaveBeenCalledWith(userId, body);
    });
  });

  // ─── HISTORY ────────────────────────────────────────

  describe('history', () => {
    it('should call riskService.getHistory with userId and default limit', async () => {
      const userId = 'user-1';
      const result = [{ date: '2026-03-01', score: 35 }];
      mockRiskEngineService.getHistory.mockResolvedValue(result);

      expect(await controller.history(userId, undefined)).toEqual(result);
      expect(mockRiskEngineService.getHistory).toHaveBeenCalledWith(userId, 30);
    });

    it('should call riskService.getHistory with userId and parsed limit', async () => {
      const userId = 'user-1';
      const result = [{ date: '2026-03-01', score: 35 }];
      mockRiskEngineService.getHistory.mockResolvedValue(result);

      expect(await controller.history(userId, '10')).toEqual(result);
      expect(mockRiskEngineService.getHistory).toHaveBeenCalledWith(userId, 10);
    });
  });
});
