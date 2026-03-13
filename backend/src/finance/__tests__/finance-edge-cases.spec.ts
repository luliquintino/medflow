import { FinanceEngine, FinancialInput } from '../finance.engine';
import { InsightsEngine } from '../finance.insights';

describe('FinanceEngine – Edge Cases', () => {
  describe('calculate with no shifts (zero revenue)', () => {
    it('should return zeroed summary with full gap to goals', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 0,
        confirmedRevenueThisMonth: 0,
      };

      const result = FinanceEngine.calculate(input);

      expect(result.currentRevenue).toBe(0);
      expect(result.revenueToMinimum).toBe(10000);
      expect(result.revenueToIdeal).toBe(15000);
      expect(result.progressToMinimum).toBe(0);
      expect(result.progressToIdeal).toBe(0);
      expect(result.isMinimumReached).toBe(false);
      expect(result.isIdealReached).toBe(false);
      expect(result.minimumShiftsRequired).toBe(7); // ceil(10000/1500)
      expect(result.idealShiftsRequired).toBe(10); // ceil(15000/1500)
    });

    it('should produce zero-revenue projections when no shifts exist', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 0,
        confirmedRevenueThisMonth: 0,
      };

      const result = FinanceEngine.calculate(input);

      expect(result.projections.threeMonths).toHaveLength(3);
      expect(result.projections.sixMonths).toHaveLength(6);
      // With 0 shifts, projected revenue per month is 0
      for (const month of result.projections.threeMonths) {
        expect(month.projectedRevenue).toBe(0);
        expect(month.projectedShifts).toBe(0);
        expect(month.goalMet).toBe(false);
      }
    });
  });

  describe('calculate with a single shift', () => {
    it('should return correct values for one shift', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 1,
        confirmedRevenueThisMonth: 1500,
      };

      const result = FinanceEngine.calculate(input);

      expect(result.currentRevenue).toBe(1500);
      expect(result.revenueToMinimum).toBe(8500);
      expect(result.revenueToIdeal).toBe(13500);
      expect(result.progressToMinimum).toBe(15); // round(1500/10000 * 100)
      expect(result.progressToIdeal).toBe(10); // round(1500/15000 * 100)
      expect(result.isMinimumReached).toBe(false);
      expect(result.isIdealReached).toBe(false);
    });
  });

  describe('calculate with goals already met', () => {
    it('should cap progress at 100 and show goals reached', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 15,
        confirmedRevenueThisMonth: 20000,
      };

      const result = FinanceEngine.calculate(input);

      expect(result.progressToMinimum).toBe(100);
      expect(result.progressToIdeal).toBe(100);
      expect(result.isMinimumReached).toBe(true);
      expect(result.isIdealReached).toBe(true);
      expect(result.revenueToMinimum).toBe(0);
      expect(result.revenueToIdeal).toBe(0);
    });
  });

  describe('calculate with zero goals', () => {
    it('should return 100% progress when goals are zero', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 0,
        idealMonthlyGoal: 0,
        savingsGoal: 0,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 0,
        confirmedRevenueThisMonth: 0,
      };

      const result = FinanceEngine.calculate(input);

      expect(result.progressToMinimum).toBe(100);
      expect(result.progressToIdeal).toBe(100);
      expect(result.isMinimumReached).toBe(true);
      expect(result.isIdealReached).toBe(true);
    });
  });

  describe('simulate', () => {
    it('should add hypothetical shift correctly', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 5,
        confirmedRevenueThisMonth: 7500,
      };

      const result = FinanceEngine.simulate(input, 2000);

      expect(result.beforeRevenue).toBe(7500);
      expect(result.afterRevenue).toBe(9500);
      expect(result.revenueGain).toBe(2000);

      // Progress should increase
      expect(result.progressToMinimumAfter).toBeGreaterThan(result.progressToMinimumBefore);
      expect(result.progressToIdealAfter).toBeGreaterThan(result.progressToIdealBefore);

      // Impact percentage = (2000 / 15000) * 100 = 13.3%
      expect(result.impactPercentage).toBe(13.3);
    });

    it('should show goal reached after simulation when threshold crossed', () => {
      const input: FinancialInput = {
        minimumMonthlyGoal: 10000,
        idealMonthlyGoal: 15000,
        savingsGoal: 5000,
        averageShiftValue: 1500,
        confirmedShiftsThisMonth: 6,
        confirmedRevenueThisMonth: 9500,
      };

      const result = FinanceEngine.simulate(input, 1000);

      expect(result.minimumReachedBefore).toBe(false);
      expect(result.minimumReachedAfter).toBe(true);
      expect(result.afterRevenue).toBe(10500);
    });
  });
});

describe('InsightsEngine – Edge Cases', () => {
  describe('generate with no financial profile data (uses defaults)', () => {
    it('should generate insights without crashing when profile has zero values', () => {
      const input = {
        shifts: [],
        profile: {
          savingsGoal: 0,
          averageShiftValue: 0,
          minimumMonthlyGoal: 0,
          idealMonthlyGoal: 0,
        },
        hospitals: [],
        currentMonthRevenue: 0,
        currentMonthConfirmedShifts: 0,
      };

      const insights = InsightsEngine.generate(input);

      // Should return an array (possibly empty, or with the "ideal reached" insight)
      expect(Array.isArray(insights)).toBe(true);
      // When ideal goal is 0 and revenue is 0, 0 >= 0 is true => "ideal reached" insight
      expect(insights.length).toBeGreaterThanOrEqual(1);
      expect(insights[0].title).toBe('Meta ideal atingida!');
    });
  });

  describe('generate with shifts but no hospitals', () => {
    it('should produce insights based on shift data without payment reminders', () => {
      const now = new Date();
      const shifts = [
        {
          date: new Date(now.getFullYear(), now.getMonth(), 5),
          value: 1500,
          hours: 12,
          type: 'TWELVE_DAY',
          status: 'CONFIRMED',
        },
        {
          date: new Date(now.getFullYear(), now.getMonth(), 10),
          value: 2000,
          hours: 24,
          type: 'TWENTY_FOUR',
          status: 'CONFIRMED',
        },
      ];

      const input = {
        shifts,
        profile: {
          savingsGoal: 5000,
          averageShiftValue: 1500,
          minimumMonthlyGoal: 10000,
          idealMonthlyGoal: 15000,
        },
        hospitals: [],
        currentMonthRevenue: 3500,
        currentMonthConfirmedShifts: 2,
      };

      const insights = InsightsEngine.generate(input);

      expect(Array.isArray(insights)).toBe(true);
      // Should NOT contain any payment day insights (no hospitals)
      const paymentInsights = insights.filter((i) => i.title.includes('Pagamento'));
      expect(paymentInsights).toHaveLength(0);
    });
  });
});
