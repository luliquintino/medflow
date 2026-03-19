import { ScenarioEngine, ScenarioInput, ScenarioResult } from '../finance-scenario.engine';

describe('ScenarioEngine', () => {
  // Pin to March 15 2026 so tests are deterministic regardless of when they run.
  // March has 31 days; daysPassed = 15 → monthlyPace = (3000/15)*31 = 6200
  const referenceDate = new Date(2026, 2, 15); // month is 0-indexed → March

  const baseInput: ScenarioInput = {
    existingShifts: [
      { date: '2026-03-05', value: 1500, hours: 12, type: 'TWELVE_DAY' },
      { date: '2026-03-10', value: 1500, hours: 12, type: 'TWELVE_DAY' },
    ],
    hypotheticalShifts: [
      { date: '2026-03-20', value: 1800, hours: 12, type: 'TWELVE_NIGHT' },
      { date: '2026-03-25', value: 2000, hours: 24, type: 'TWENTY_FOUR' },
    ],
    projectionMonths: 3,
    minimumMonthlyGoal: 10000,
    idealMonthlyGoal: 15000,
    averageShiftValue: 1600,
    referenceDate,
  };

  it('should return monthly breakdown with current + added revenue', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.monthlyBreakdown).toBeDefined();
    expect(result.monthlyBreakdown.length).toBeGreaterThanOrEqual(1);
    const march = result.monthlyBreakdown[0];
    expect(march.currentRevenue).toBe(3000); // 2 existing shifts × 1500
    expect(march.addedRevenue).toBe(3800); // 1800 + 2000
    expect(march.totalRevenue).toBe(6800);
  });

  it('should calculate goal progress percentages', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    expect(march.minimumGoalProgress).toBeCloseTo(68, 0); // 6800/10000
    expect(march.idealGoalProgress).toBeCloseTo(45.3, 0); // 6800/15000
  });

  it('should project future months based on pace', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.monthlyBreakdown.length).toBe(3); // projectionMonths=3
    // Future months should have projected values (monthlyPace = (3000/15)*31 = 6200)
    expect(result.monthlyBreakdown[1].totalRevenue).toBeGreaterThan(0);
  });

  it('should return summary with totals', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.summary.totalAddedRevenue).toBe(3800);
    expect(result.summary.avgMonthlyIncome).toBeGreaterThan(0);
  });

  it('should handle empty hypothetical shifts', () => {
    const input = { ...baseInput, hypotheticalShifts: [] };
    const result = ScenarioEngine.calculate(input);
    expect(result.monthlyBreakdown[0].addedRevenue).toBe(0);
  });

  it('should cap at 10 hypothetical shifts', () => {
    const manyShifts = Array(15).fill({
      date: '2026-03-20',
      value: 1000,
      hours: 12,
      type: 'TWELVE_DAY',
    });
    const input = { ...baseInput, hypotheticalShifts: manyShifts };
    const result = ScenarioEngine.calculate(input);
    // Should only use first 10
    expect(result.summary.totalAddedRevenue).toBe(10000);
  });

  it('should generate correct month labels', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.monthlyBreakdown[0].month).toBe('Mar/26');
    expect(result.monthlyBreakdown[1].month).toBe('Abr/26');
    expect(result.monthlyBreakdown[2].month).toBe('Mai/26');
  });

  it('should calculate goal gaps correctly', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    // totalRevenue = 6800, minimumGoal = 10000, idealGoal = 15000
    expect(march.minimumGoalGap).toBe(3200);
    expect(march.idealGoalGap).toBe(8200);
  });

  it('should suggest extra shifts based on ideal gap', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    // idealGap = 8200, averageShiftValue = 1600 → ceil(8200/1600) = 6
    expect(march.suggestedExtraShifts).toBe(6);
  });

  it('should use pace projection for future months', () => {
    const result = ScenarioEngine.calculate(baseInput);
    // monthlyPace = (3000 / 15) * 31 = 6200
    const april = result.monthlyBreakdown[1];
    expect(april.currentRevenue).toBe(6200);
    // No hypothetical shifts in April
    expect(april.addedRevenue).toBe(0);
    expect(april.totalRevenue).toBe(6200);
  });

  it('should use fallback pace when no existing shifts in current month', () => {
    const input: ScenarioInput = {
      ...baseInput,
      existingShifts: [],
    };
    const result = ScenarioEngine.calculate(input);
    // fallback: averageShiftValue * 4 = 1600 * 4 = 6400
    // current month: 0 existing, but future months use fallback
    expect(result.monthlyBreakdown[0].currentRevenue).toBe(0);
    expect(result.monthlyBreakdown[1].currentRevenue).toBe(6400);
  });

  it('should report monthsToMinGoal when a month meets the minimum', () => {
    const input: ScenarioInput = {
      ...baseInput,
      minimumMonthlyGoal: 5000,
    };
    const result = ScenarioEngine.calculate(input);
    // March total = 6800, which is >= 5000 → monthsToMinGoal = 1 (first month)
    expect(result.summary.monthsToMinGoal).toBe(1);
  });

  it('should return null for monthsToMinGoal when never met', () => {
    const input: ScenarioInput = {
      ...baseInput,
      minimumMonthlyGoal: 999999,
    };
    const result = ScenarioEngine.calculate(input);
    expect(result.summary.monthsToMinGoal).toBeNull();
  });

  it('should handle single projection month', () => {
    const input: ScenarioInput = {
      ...baseInput,
      projectionMonths: 1,
    };
    const result = ScenarioEngine.calculate(input);
    expect(result.monthlyBreakdown.length).toBe(1);
  });

  it('should track hours from shifts', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    // existing: 12+12=24, hypothetical: 12+24=36 → total = 60
    expect(march.hoursWorked).toBe(60);
  });

  it('should count shifts correctly', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    // existing: 2, hypothetical: 2 → total = 4
    expect(march.shiftsCount).toBe(4);
  });
});
