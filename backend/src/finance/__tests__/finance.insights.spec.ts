import { InsightsEngine } from '../finance.insights';

const baseProfile = {
  fixedMonthlyCosts: 5000,
  savingsGoal: 2000,
  averageShiftValue: 1500,
  minimumMonthlyGoal: 7000,
  idealMonthlyGoal: 10000,
};

describe('InsightsEngine', () => {
  it('should return positive insight when ideal goal is met', () => {
    const result = InsightsEngine.generate({
      shifts: [],
      profile: baseProfile,
      hospitals: [],
      currentMonthRevenue: 12000,
      currentMonthConfirmedShifts: 8,
    });
    expect(result.some((i) => i.type === 'positive' && i.title.includes('Meta ideal'))).toBe(true);
  });

  it('should return action insight when below minimum goal', () => {
    const result = InsightsEngine.generate({
      shifts: [],
      profile: baseProfile,
      hospitals: [],
      currentMonthRevenue: 3000,
      currentMonthConfirmedShifts: 2,
    });
    expect(result.some((i) => i.type === 'action')).toBe(true);
  });

  it('should limit insights to 5', () => {
    const result = InsightsEngine.generate({
      shifts: [],
      profile: baseProfile,
      hospitals: [],
      currentMonthRevenue: 3000,
      currentMonthConfirmedShifts: 2,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('should sort insights by priority', () => {
    const result = InsightsEngine.generate({
      shifts: [],
      profile: baseProfile,
      hospitals: [],
      currentMonthRevenue: 5000,
      currentMonthConfirmedShifts: 3,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
    }
  });
});
