import { OptimizationEngine, OptimizationInput } from '../optimization.engine';
import { DEFAULT_ENERGY_COSTS } from '../../shifts/shifts.engine';

describe('OptimizationEngine', () => {
  const baseInput: OptimizationInput = {
    idealMonthlyGoal: 10000,
    confirmedRevenueThisMonth: 5000,
    confirmedShifts: [],
    availableTemplates: [
      {
        id: 't1',
        hospitalName: 'Hospital A',
        type: 'DIURNO_12H',
        durationInHours: 12,
        defaultValue: 1500,
        isNightShift: false,
      },
    ],
    riskLimits: {
      maxWeeklyHours: 60,
      maxConsecutiveNights: 3,
      maxHoursIn5Days: 72,
    },
    daysRemainingInMonth: 15,
    today: new Date('2026-03-15'),
    energyCosts: DEFAULT_ENERGY_COSTS,
  };

  it('should return goal already met when revenue >= target', () => {
    const input = { ...baseInput, confirmedRevenueThisMonth: 12000 };
    const result = OptimizationEngine.optimize(input);
    expect(result.isGoalAlreadyMet).toBe(true);
    expect(result.financialGap).toBe(0);
    expect(result.suggestedScenarios).toHaveLength(0);
  });

  it('should calculate financial gap', () => {
    const result = OptimizationEngine.optimize(baseInput);
    expect(result.financialGap).toBe(5000);
    expect(result.gapPercentage).toBe(50);
    expect(result.isGoalAlreadyMet).toBe(false);
  });

  it('should suggest scenarios when gap exists', () => {
    const result = OptimizationEngine.optimize(baseInput);
    expect(result.suggestedScenarios.length).toBeGreaterThan(0);
  });

  it('should return empty scenarios if no templates available', () => {
    const input = { ...baseInput, availableTemplates: [] };
    const result = OptimizationEngine.optimize(input);
    expect(result.suggestedScenarios).toHaveLength(0);
  });

  it('should not suggest HIGH risk scenarios', () => {
    const result = OptimizationEngine.optimize(baseInput);
    result.suggestedScenarios.forEach((s) => {
      expect(s.riskLevel).not.toBe('HIGH');
    });
  });

  it('should limit to 5 scenarios max', () => {
    const input = {
      ...baseInput,
      availableTemplates: [
        {
          id: 't1',
          hospitalName: 'H1',
          type: 'DIURNO_12H',
          durationInHours: 12,
          defaultValue: 1500,
          isNightShift: false,
        },
        {
          id: 't2',
          hospitalName: 'H2',
          type: 'NOTURNO_12H',
          durationInHours: 12,
          defaultValue: 1800,
          isNightShift: true,
        },
        {
          id: 't3',
          hospitalName: 'H3',
          type: 'PLANTAO_24H',
          durationInHours: 24,
          defaultValue: 2500,
          isNightShift: false,
        },
      ],
    };
    const result = OptimizationEngine.optimize(input);
    expect(result.suggestedScenarios.length).toBeLessThanOrEqual(5);
  });

  it('should sort scenarios by optimization score (descending)', () => {
    const result = OptimizationEngine.optimize(baseInput);
    for (let i = 1; i < result.suggestedScenarios.length; i++) {
      expect(result.suggestedScenarios[i].optimizationScore).toBeLessThanOrEqual(
        result.suggestedScenarios[i - 1].optimizationScore,
      );
    }
  });
});
