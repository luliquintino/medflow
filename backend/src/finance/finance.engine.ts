/**
 * Finance Engine
 * Pure business logic — no database, no HTTP, fully testable.
 */

export interface FinancialInput {
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  savingsGoal: number;
  averageShiftValue: number;
  confirmedShiftsThisMonth: number;
  confirmedRevenueThisMonth: number;
}

export interface FinancialProjection {
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  minimumShiftsRequired: number;
  idealShiftsRequired: number;
  currentRevenue: number;
  revenueToMinimum: number; // gap to minimum
  revenueToIdeal: number; // gap to ideal
  progressToMinimum: number; // 0-100%
  progressToIdeal: number; // 0-100%
  isMinimumReached: boolean;
  isIdealReached: boolean;
  projections: {
    threeMonths: MonthProjection[];
    sixMonths: MonthProjection[];
  };
}

export interface MonthProjection {
  month: number; // 1=next, 2=in 2 months...
  label: string;
  projectedRevenue: number;
  projectedShifts: number;
  goalMet: boolean;
}

export interface SimulationResult {
  beforeRevenue: number;
  afterRevenue: number;
  revenueGain: number;
  progressToMinimumBefore: number;
  progressToMinimumAfter: number;
  progressToIdealBefore: number;
  progressToIdealAfter: number;
  minimumReachedBefore: boolean;
  minimumReachedAfter: boolean;
  idealReachedBefore: boolean;
  idealReachedAfter: boolean;
  impactPercentage: number;
}

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export class FinanceEngine {
  static calculate(input: FinancialInput): FinancialProjection {
    const { minimumMonthlyGoal, idealMonthlyGoal } = input;

    const avgValue = input.averageShiftValue || 1;

    const minimumShiftsRequired = Math.ceil(minimumMonthlyGoal / avgValue);
    const idealShiftsRequired = Math.ceil(idealMonthlyGoal / avgValue);

    const currentRevenue = input.confirmedRevenueThisMonth;
    const revenueToMinimum = Math.max(0, minimumMonthlyGoal - currentRevenue);
    const revenueToIdeal = Math.max(0, idealMonthlyGoal - currentRevenue);

    const progressToMinimum =
      minimumMonthlyGoal > 0 ? Math.min(100, (currentRevenue / minimumMonthlyGoal) * 100) : 100;

    const progressToIdeal =
      idealMonthlyGoal > 0 ? Math.min(100, (currentRevenue / idealMonthlyGoal) * 100) : 100;

    const now = new Date();

    const buildProjections = (months: number): MonthProjection[] => {
      const result: MonthProjection[] = [];
      // Average shifts per month based on current pace
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysPassed = now.getDate();
      const pace =
        daysPassed > 0
          ? (input.confirmedShiftsThisMonth / daysPassed) * daysInMonth
          : input.confirmedShiftsThisMonth;

      for (let i = 1; i <= months; i++) {
        const monthIndex = (now.getMonth() + i) % 12;
        const projectedShifts = Math.round(pace);
        const projectedRevenue = projectedShifts * avgValue;
        result.push({
          month: i,
          label: MONTH_NAMES[monthIndex],
          projectedRevenue,
          projectedShifts,
          goalMet: projectedRevenue >= idealMonthlyGoal,
        });
      }
      return result;
    };

    return {
      minimumMonthlyGoal,
      idealMonthlyGoal,
      minimumShiftsRequired,
      idealShiftsRequired,
      currentRevenue,
      revenueToMinimum,
      revenueToIdeal,
      progressToMinimum: Math.round(progressToMinimum),
      progressToIdeal: Math.round(progressToIdeal),
      isMinimumReached: currentRevenue >= minimumMonthlyGoal,
      isIdealReached: currentRevenue >= idealMonthlyGoal,
      projections: {
        threeMonths: buildProjections(3),
        sixMonths: buildProjections(6),
      },
    };
  }

  static simulate(input: FinancialInput, hypotheticalShiftValue: number): SimulationResult {
    const before = this.calculate(input);

    const afterInput = {
      ...input,
      confirmedShiftsThisMonth: input.confirmedShiftsThisMonth + 1,
      confirmedRevenueThisMonth: input.confirmedRevenueThisMonth + hypotheticalShiftValue,
    };

    const after = this.calculate(afterInput);

    const revenueGain = hypotheticalShiftValue;
    const impactPercentage =
      before.idealMonthlyGoal > 0 ? (revenueGain / before.idealMonthlyGoal) * 100 : 0;

    return {
      beforeRevenue: before.currentRevenue,
      afterRevenue: after.currentRevenue,
      revenueGain,
      progressToMinimumBefore: before.progressToMinimum,
      progressToMinimumAfter: after.progressToMinimum,
      progressToIdealBefore: before.progressToIdeal,
      progressToIdealAfter: after.progressToIdeal,
      minimumReachedBefore: before.isMinimumReached,
      minimumReachedAfter: after.isMinimumReached,
      idealReachedBefore: before.isIdealReached,
      idealReachedAfter: after.isIdealReached,
      impactPercentage: Math.round(impactPercentage * 10) / 10,
    };
  }
}
