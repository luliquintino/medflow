import { AnalyticsEngine, AnalyticsInput, AnalyticsShift } from '../analytics.engine';

function makeShift(overrides: Partial<AnalyticsShift> = {}): AnalyticsShift {
  return {
    date: new Date(),
    value: 1500,
    hours: 12,
    type: 'TWELVE_DAY',
    status: 'CONFIRMED',
    realized: null,
    hospitalId: 'h1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    shifts: [],
    hospitals: [
      { id: 'h1', name: 'Hospital A' },
      { id: 'h2', name: 'Hospital B' },
    ],
    monthsBack: 6,
    ...overrides,
  };
}

describe('AnalyticsEngine', () => {
  describe('empty shifts', () => {
    it('should return zeroed results when no shifts', () => {
      const result = AnalyticsEngine.calculate(makeInput());

      expect(result.hospitalRanking).toHaveLength(0);
      expect(result.incomeByShiftType).toHaveLength(0);
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.totalShifts).toBe(0);
      expect(result.summary.totalHours).toBe(0);
      expect(result.summary.avgPerShift).toBe(0);
      expect(result.summary.avgPerHour).toBe(0);
      expect(result.summary.bestHospital).toBeNull();
      expect(result.summary.overallGrowthPercent).toBeNull();
      expect(result.monthlyIncome.length).toBeGreaterThan(0);
      // All months should have 0 revenue
      for (const m of result.monthlyIncome) {
        expect(m.revenue).toBe(0);
        expect(m.shiftCount).toBe(0);
      }
    });
  });

  describe('single hospital', () => {
    it('should have 100% revenue share for single hospital', () => {
      const now = new Date();
      const shifts = [
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
          value: 2000,
          hospitalId: 'h1',
        }),
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
          value: 1500,
          hospitalId: 'h1',
        }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.hospitalRanking).toHaveLength(1);
      expect(result.hospitalRanking[0].hospitalName).toBe('Hospital A');
      expect(result.hospitalRanking[0].revenueShare).toBe(100);
      expect(result.hospitalRanking[0].totalRevenue).toBe(3500);
      expect(result.hospitalRanking[0].shiftCount).toBe(2);
    });
  });

  describe('multi-hospital ranking', () => {
    it('should rank hospitals by total revenue descending', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 1000, hospitalId: 'h1' }),
        makeShift({ date: lastMonth, value: 3000, hospitalId: 'h2' }),
        makeShift({ date: lastMonth, value: 1000, hospitalId: 'h1' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.hospitalRanking).toHaveLength(2);
      expect(result.hospitalRanking[0].hospitalName).toBe('Hospital B');
      expect(result.hospitalRanking[0].totalRevenue).toBe(3000);
      expect(result.hospitalRanking[1].hospitalName).toBe('Hospital A');
      expect(result.hospitalRanking[1].totalRevenue).toBe(2000);
    });

    it('should calculate correct revenue shares', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 3000, hospitalId: 'h1' }),
        makeShift({ date: lastMonth, value: 1000, hospitalId: 'h2' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.hospitalRanking[0].revenueShare).toBe(75);
      expect(result.hospitalRanking[1].revenueShare).toBe(25);
    });

    it('should calculate avgPerShift per hospital', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 2000, hospitalId: 'h1' }),
        makeShift({ date: lastMonth, value: 1000, hospitalId: 'h1' }),
        makeShift({ date: lastMonth, value: 3000, hospitalId: 'h2' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      const hospitalA = result.hospitalRanking.find((h) => h.hospitalName === 'Hospital A');
      const hospitalB = result.hospitalRanking.find((h) => h.hospitalName === 'Hospital B');

      expect(hospitalA?.avgPerShift).toBe(1500);
      expect(hospitalB?.avgPerShift).toBe(3000);
    });
  });

  describe('month-over-month growth', () => {
    it('should calculate positive growth correctly', () => {
      const now = new Date();
      const shifts = [
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 2, 10),
          value: 1000,
        }),
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
          value: 1500,
        }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      // Find the growth entry for the month that went from 1000 → 1500
      const growthEntries = result.monthOverMonthGrowth.filter((g) => g.growthPercent !== 0);
      expect(growthEntries.length).toBeGreaterThan(0);
      // 50% growth from 1000 to 1500
      expect(growthEntries.some((g) => g.growthPercent === 50)).toBe(true);
    });

    it('should calculate negative growth correctly', () => {
      const now = new Date();
      const shifts = [
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 2, 10),
          value: 2000,
        }),
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
          value: 1000,
        }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      const growthEntries = result.monthOverMonthGrowth.filter((g) => g.growthPercent !== 0);
      expect(growthEntries.some((g) => g.growthPercent === -50)).toBe(true);
    });
  });

  describe('shift type breakdown', () => {
    it('should group by shift type', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 1500, hours: 12, type: 'TWELVE_DAY' }),
        makeShift({ date: lastMonth, value: 2000, hours: 24, type: 'TWENTY_FOUR' }),
        makeShift({ date: lastMonth, value: 1800, hours: 12, type: 'TWELVE_NIGHT' }),
        makeShift({ date: lastMonth, value: 1500, hours: 12, type: 'TWELVE_DAY' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.incomeByShiftType).toHaveLength(3);

      const twelve = result.incomeByShiftType.find((t) => t.type === 'TWELVE_DAY');
      const twentyFour = result.incomeByShiftType.find((t) => t.type === 'TWENTY_FOUR');
      const night = result.incomeByShiftType.find((t) => t.type === 'TWELVE_NIGHT');

      expect(twelve?.totalRevenue).toBe(3000);
      expect(twelve?.shiftCount).toBe(2);
      expect(twelve?.avgPerHour).toBe(125); // 3000 / 24 hours
      expect(twelve?.typeLabel).toBe('Diurno 12h');

      expect(twentyFour?.totalRevenue).toBe(2000);
      expect(twentyFour?.avgPerHour).toBeCloseTo(83.33, 1);
      expect(twentyFour?.typeLabel).toBe('Plantão 24h');

      expect(night?.totalRevenue).toBe(1800);
      expect(night?.typeLabel).toBe('Noturno');
    });
  });

  describe('filtering', () => {
    it('should exclude non-CONFIRMED shifts', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 1500, status: 'CONFIRMED' }),
        makeShift({ date: lastMonth, value: 2000, status: 'SIMULATED' }),
        makeShift({ date: lastMonth, value: 1000, status: 'CANCELLED' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.summary.totalRevenue).toBe(1500);
      expect(result.summary.totalShifts).toBe(1);
    });

    it('should exclude realized === false shifts', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 1500, realized: null }),
        makeShift({ date: lastMonth, value: 2000, realized: false }),
        makeShift({ date: lastMonth, value: 1000, realized: true }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.summary.totalRevenue).toBe(2500);
      expect(result.summary.totalShifts).toBe(2);
    });
  });

  describe('summary', () => {
    it('should calculate summary KPIs correctly', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);

      const shifts = [
        makeShift({ date: lastMonth, value: 1500, hours: 12, hospitalId: 'h1' }),
        makeShift({ date: lastMonth, value: 2500, hours: 24, hospitalId: 'h2' }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.summary.totalRevenue).toBe(4000);
      expect(result.summary.totalShifts).toBe(2);
      expect(result.summary.totalHours).toBe(36);
      expect(result.summary.avgPerShift).toBe(2000);
      expect(result.summary.avgPerHour).toBeCloseTo(111.11, 1);
      expect(result.summary.bestHospital).toBe('Hospital B');
    });

    it('should calculate overall growth from first to last non-zero month', () => {
      const now = new Date();

      const shifts = [
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 3, 10),
          value: 2000,
        }),
        makeShift({
          date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
          value: 3000,
        }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      expect(result.summary.overallGrowthPercent).toBe(50);
    });
  });

  describe('monthlyIncome', () => {
    it('should include all months in range even with no data', () => {
      const result = AnalyticsEngine.calculate(makeInput({ monthsBack: 3 }));

      // monthsBack=3 means 4 entries: 3 months ago, 2 ago, 1 ago, current
      expect(result.monthlyIncome).toHaveLength(4);
    });

    it('should aggregate multiple shifts in same month', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);
      const lastMonth2 = new Date(now.getFullYear(), now.getMonth() - 1, 20);

      const shifts = [
        makeShift({ date: lastMonth, value: 1000 }),
        makeShift({ date: lastMonth2, value: 2000 }),
      ];

      const result = AnalyticsEngine.calculate(makeInput({ shifts }));

      const lastMonthData = result.monthlyIncome.find(
        (m) => m.month === lastMonth.getMonth() && m.year === lastMonth.getFullYear(),
      );

      expect(lastMonthData?.revenue).toBe(3000);
      expect(lastMonthData?.shiftCount).toBe(2);
    });
  });
});
