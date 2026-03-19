import {
  BenchmarkingEngine,
  MonthlyData,
  FinancialGoals,
  BenchmarkingResult,
} from '../benchmarking.engine';

describe('BenchmarkingEngine', () => {
  const goals: FinancialGoals = {
    minimumMonthlyGoal: 10000,
    idealMonthlyGoal: 15000,
  };

  // 6 months of data, oldest first, with a clear upward revenue trend
  // Rev/hr: older avg ~62.7, recent avg ~74.0 => ~18% rise
  const sixMonths: MonthlyData[] = [
    { month: 9, year: 2025, revenue: 7500, hours: 120, shiftsCount: 10 },
    { month: 10, year: 2025, revenue: 8000, hours: 130, shiftsCount: 11 },
    { month: 11, year: 2025, revenue: 7800, hours: 125, shiftsCount: 10 },
    { month: 0, year: 2026, revenue: 10000, hours: 140, shiftsCount: 12 },
    { month: 1, year: 2026, revenue: 11000, hours: 150, shiftsCount: 13 },
    { month: 2, year: 2026, revenue: 12000, hours: 155, shiftsCount: 13 },
  ];

  describe('Period Snapshots', () => {
    it('should calculate currentMonth snapshot from last element', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      expect(result.snapshots.currentMonth.revenue).toBe(12000);
      expect(result.snapshots.currentMonth.hours).toBe(155);
      expect(result.snapshots.currentMonth.shiftsCount).toBe(13);
      expect(result.snapshots.currentMonth.revenuePerHour).toBeCloseTo(
        12000 / 155,
        1,
      );
    });

    it('should calculate previousMonth snapshot from second-to-last', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      expect(result.snapshots.previousMonth.revenue).toBe(11000);
      expect(result.snapshots.previousMonth.hours).toBe(150);
    });

    it('should calculate threeMonthAvg from last 3 months', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      const expectedRevenue = (10000 + 11000 + 12000) / 3;
      const expectedHours = (140 + 150 + 155) / 3;
      expect(result.snapshots.threeMonthAvg.revenue).toBeCloseTo(
        expectedRevenue,
        0,
      );
      expect(result.snapshots.threeMonthAvg.hours).toBeCloseTo(
        expectedHours,
        0,
      );
    });

    it('should calculate sixMonthAvg from all 6 months', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      const expectedRevenue =
        (7500 + 8000 + 7800 + 10000 + 11000 + 12000) / 6;
      expect(result.snapshots.sixMonthAvg.revenue).toBeCloseTo(
        expectedRevenue,
        0,
      );
    });

    it('should compute revenuePerHour as revenue/hours', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      expect(result.snapshots.sixMonthAvg.revenuePerHour).toBeGreaterThan(0);
    });
  });

  describe('Deltas', () => {
    it('should calculate vsLastMonth as percentage change', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // revenue: (12000 - 11000) / 11000 * 100 = ~9.09%
      expect(result.deltas.vsLastMonth.revenue).toBeCloseTo(9.09, 0);
    });

    it('should calculate vsThreeMonthAvg as percentage change', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      const threeMonthAvgRev = (10000 + 11000 + 12000) / 3;
      const expectedPct =
        ((12000 - threeMonthAvgRev) / threeMonthAvgRev) * 100;
      expect(result.deltas.vsThreeMonthAvg.revenue).toBeCloseTo(
        expectedPct,
        0,
      );
    });

    it('should return zero deltas for single month of data', () => {
      const singleMonth: MonthlyData[] = [
        { month: 2, year: 2026, revenue: 12000, hours: 155, shiftsCount: 13 },
      ];
      const result = BenchmarkingEngine.calculate(singleMonth, goals);
      expect(result.deltas.vsLastMonth.revenue).toBe(0);
      expect(result.deltas.vsLastMonth.hours).toBe(0);
      expect(result.deltas.vsThreeMonthAvg.revenue).toBe(0);
    });
  });

  describe('Goal Comparison', () => {
    it('should calculate progress as percentage of goal', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // currentMonth revenue = 12000, minGoal = 10000 => 120% but capped at 100
      expect(result.goals.vsMinimumGoal.progress).toBe(100);
      // idealGoal = 15000 => 12000/15000 = 80%
      expect(result.goals.vsIdealGoal.progress).toBeCloseTo(80, 0);
    });

    it('should calculate gap as remaining amount to reach goal', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // minGoal met: gap = 0
      expect(result.goals.vsMinimumGoal.gap).toBe(0);
      // idealGoal: 15000 - 12000 = 3000
      expect(result.goals.vsIdealGoal.gap).toBe(3000);
    });

    it('should mark onTrack=true when revenue >= goal', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      expect(result.goals.vsMinimumGoal.onTrack).toBe(true);
    });

    it('should mark onTrack=true when trend is rising and progress > 70%', () => {
      // Revenue is rising and at 80% of ideal goal
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // With our rising data and 80% progress, should be onTrack
      expect(result.goals.vsIdealGoal.onTrack).toBe(true);
    });

    it('should mark onTrack=false when below goal and not rising', () => {
      // Flat data at 50% of ideal goal
      const flatData: MonthlyData[] = [
        { month: 9, year: 2025, revenue: 7500, hours: 120, shiftsCount: 10 },
        { month: 10, year: 2025, revenue: 7500, hours: 120, shiftsCount: 10 },
        { month: 11, year: 2025, revenue: 7500, hours: 120, shiftsCount: 10 },
        { month: 0, year: 2026, revenue: 7500, hours: 120, shiftsCount: 10 },
        { month: 1, year: 2026, revenue: 7500, hours: 120, shiftsCount: 10 },
        { month: 2, year: 2026, revenue: 7500, hours: 120, shiftsCount: 10 },
      ];
      const result = BenchmarkingEngine.calculate(flatData, goals);
      // 7500 / 15000 = 50%, trend is stable, not onTrack
      expect(result.goals.vsIdealGoal.onTrack).toBe(false);
    });
  });

  describe('Trends', () => {
    it('should detect "rising" when recent avg is >10% above older avg', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // Older 3 months avg hours: ~125, Recent 3 months avg hours: ~148 => ~18% up
      expect(result.trends.workload).toBe('rising');
      // Rev/hr: older avg ~62.1, recent avg ~74.0 => ~19% rise
      expect(result.trends.revenuePerHour).toBe('rising');
    });

    it('should detect "falling" when recent avg is >10% below older avg', () => {
      const decliningData: MonthlyData[] = [
        { month: 9, year: 2025, revenue: 15000, hours: 200, shiftsCount: 15 },
        { month: 10, year: 2025, revenue: 14000, hours: 190, shiftsCount: 14 },
        { month: 11, year: 2025, revenue: 13000, hours: 180, shiftsCount: 13 },
        { month: 0, year: 2026, revenue: 10000, hours: 140, shiftsCount: 10 },
        { month: 1, year: 2026, revenue: 9000, hours: 130, shiftsCount: 9 },
        { month: 2, year: 2026, revenue: 8000, hours: 120, shiftsCount: 8 },
      ];
      const result = BenchmarkingEngine.calculate(decliningData, goals);
      expect(result.trends.workload).toBe('falling');
    });

    it('should detect "stable" when change is within 10%', () => {
      const stableData: MonthlyData[] = [
        { month: 9, year: 2025, revenue: 10000, hours: 150, shiftsCount: 12 },
        { month: 10, year: 2025, revenue: 10100, hours: 151, shiftsCount: 12 },
        { month: 11, year: 2025, revenue: 9900, hours: 149, shiftsCount: 12 },
        { month: 0, year: 2026, revenue: 10050, hours: 150, shiftsCount: 12 },
        { month: 1, year: 2026, revenue: 10000, hours: 150, shiftsCount: 12 },
        { month: 2, year: 2026, revenue: 10100, hours: 151, shiftsCount: 12 },
      ];
      const result = BenchmarkingEngine.calculate(stableData, goals);
      expect(result.trends.revenuePerHour).toBe('stable');
      expect(result.trends.workload).toBe('stable');
    });

    it('should detect goalAttainment trend', () => {
      const result = BenchmarkingEngine.calculate(sixMonths, goals);
      // Revenue going from 8000 to 12000 vs 15000 goal => attainment rising
      expect(result.trends.goalAttainment).toBe('rising');
    });
  });

  describe('Edge Cases', () => {
    it('should return defaults for empty data', () => {
      const result = BenchmarkingEngine.calculate([], goals);
      expect(result.snapshots.currentMonth.revenue).toBe(0);
      expect(result.snapshots.previousMonth.revenue).toBe(0);
      expect(result.deltas.vsLastMonth.revenue).toBe(0);
      expect(result.goals.vsMinimumGoal.gap).toBe(10000);
      expect(result.goals.vsIdealGoal.gap).toBe(15000);
      expect(result.goals.vsMinimumGoal.onTrack).toBe(false);
      expect(result.trends.revenuePerHour).toBe('stable');
    });

    it('should handle single month of data', () => {
      const singleMonth: MonthlyData[] = [
        { month: 2, year: 2026, revenue: 12000, hours: 155, shiftsCount: 13 },
      ];
      const result = BenchmarkingEngine.calculate(singleMonth, goals);
      expect(result.snapshots.currentMonth.revenue).toBe(12000);
      expect(result.snapshots.previousMonth.revenue).toBe(0);
      expect(result.snapshots.threeMonthAvg.revenue).toBe(12000);
      expect(result.snapshots.sixMonthAvg.revenue).toBe(12000);
      expect(result.deltas.vsLastMonth.revenue).toBe(0);
      expect(result.trends.revenuePerHour).toBe('stable');
    });

    it('should handle all-zero months', () => {
      const zeroData: MonthlyData[] = [
        { month: 0, year: 2026, revenue: 0, hours: 0, shiftsCount: 0 },
        { month: 1, year: 2026, revenue: 0, hours: 0, shiftsCount: 0 },
        { month: 2, year: 2026, revenue: 0, hours: 0, shiftsCount: 0 },
      ];
      const result = BenchmarkingEngine.calculate(zeroData, goals);
      expect(result.snapshots.currentMonth.revenue).toBe(0);
      expect(result.snapshots.currentMonth.revenuePerHour).toBe(0);
      expect(result.deltas.vsLastMonth.revenue).toBe(0);
      expect(result.goals.vsMinimumGoal.progress).toBe(0);
      expect(result.goals.vsMinimumGoal.onTrack).toBe(false);
      expect(result.trends.revenuePerHour).toBe('stable');
    });

    it('should handle two months of data', () => {
      const twoMonths: MonthlyData[] = [
        { month: 1, year: 2026, revenue: 10000, hours: 150, shiftsCount: 12 },
        { month: 2, year: 2026, revenue: 12000, hours: 160, shiftsCount: 13 },
      ];
      const result = BenchmarkingEngine.calculate(twoMonths, goals);
      expect(result.snapshots.currentMonth.revenue).toBe(12000);
      expect(result.snapshots.previousMonth.revenue).toBe(10000);
      expect(result.deltas.vsLastMonth.revenue).toBeCloseTo(20, 0);
    });

    it('should handle zero goals gracefully', () => {
      const zeroGoals: FinancialGoals = {
        minimumMonthlyGoal: 0,
        idealMonthlyGoal: 0,
      };
      const result = BenchmarkingEngine.calculate(sixMonths, zeroGoals);
      expect(result.goals.vsMinimumGoal.progress).toBe(100);
      expect(result.goals.vsMinimumGoal.onTrack).toBe(true);
      expect(result.goals.vsIdealGoal.gap).toBe(0);
    });

    it('should only use last 6 months when given more data', () => {
      const eightMonths: MonthlyData[] = [
        { month: 7, year: 2025, revenue: 5000, hours: 80, shiftsCount: 6 },
        { month: 8, year: 2025, revenue: 5500, hours: 85, shiftsCount: 7 },
        ...sixMonths,
      ];
      const result = BenchmarkingEngine.calculate(eightMonths, goals);
      // Should ignore the first 2, current month still = last element of sixMonths
      expect(result.snapshots.currentMonth.revenue).toBe(12000);
    });

    it('should handle months with zero hours (avoid division by zero)', () => {
      const zeroHoursData: MonthlyData[] = [
        { month: 1, year: 2026, revenue: 5000, hours: 0, shiftsCount: 5 },
        { month: 2, year: 2026, revenue: 10000, hours: 0, shiftsCount: 10 },
      ];
      const result = BenchmarkingEngine.calculate(zeroHoursData, goals);
      expect(result.snapshots.currentMonth.revenuePerHour).toBe(0);
      expect(result.deltas.vsLastMonth.revenuePerHour).toBe(0);
    });
  });
});
