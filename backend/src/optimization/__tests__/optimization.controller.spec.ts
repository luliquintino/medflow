import { Test, TestingModule } from '@nestjs/testing';
import { OptimizationController } from '../optimization.controller';
import { OptimizationService } from '../optimization.service';

const mockOptimizationService = {
  suggest: jest.fn(),
  apply: jest.fn(),
};

describe('OptimizationController', () => {
  let controller: OptimizationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OptimizationController],
      providers: [{ provide: OptimizationService, useValue: mockOptimizationService }],
    }).compile();

    controller = module.get<OptimizationController>(OptimizationController);
  });

  // ─── SUGGEST ────────────────────────────────────────

  describe('suggest', () => {
    it('should call optimizationService.suggest with userId', async () => {
      const userId = 'user-1';
      const result = {
        scenarios: [{ name: 'Balanced', shifts: [], projectedIncome: 30000, riskDelta: -5 }],
      };
      mockOptimizationService.suggest.mockResolvedValue(result);

      expect(await controller.suggest(userId)).toEqual(result);
      expect(mockOptimizationService.suggest).toHaveBeenCalledWith(userId);
    });
  });

  // ─── APPLY ──────────────────────────────────────────

  describe('apply', () => {
    it('should call optimizationService.apply with userId and shifts array', async () => {
      const userId = 'user-1';
      const dto = {
        shifts: [
          { templateId: 'tmpl-1', date: '2026-04-01' },
          { templateId: 'tmpl-2', date: '2026-04-03' },
        ],
      };
      const result = { created: 2, shifts: [{ id: 'shift-1' }, { id: 'shift-2' }] };
      mockOptimizationService.apply.mockResolvedValue(result);

      expect(await controller.apply(userId, dto as any)).toEqual(result);
      expect(mockOptimizationService.apply).toHaveBeenCalledWith(userId, dto.shifts);
    });

    it('should handle empty shifts array', async () => {
      const userId = 'user-1';
      const dto = { shifts: [] };
      const result = { created: 0, shifts: [] };
      mockOptimizationService.apply.mockResolvedValue(result);

      expect(await controller.apply(userId, dto as any)).toEqual(result);
      expect(mockOptimizationService.apply).toHaveBeenCalledWith(userId, []);
    });
  });
});
