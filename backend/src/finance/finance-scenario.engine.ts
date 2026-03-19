/**
 * Compound Scenario Simulation Engine
 * Pure business logic — no database, no HTTP, fully testable.
 *
 * Receives existing shifts + hypothetical shifts + projection months + goals
 * and returns a monthly breakdown with revenue, goal progress, gaps, and suggestions.
 */

export interface ScenarioShift {
  date: string;
  value: number;
  hours: number;
  type: string;
}

export interface ScenarioInput {
  existingShifts: ScenarioShift[];
  hypotheticalShifts: ScenarioShift[];
  projectionMonths: 1 | 3 | 6;
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  averageShiftValue: number;
  /** Optional reference date for deterministic testing (defaults to now) */
  referenceDate?: Date;
}

export interface MonthBreakdown {
  month: string; // "Mar/26"
  year: number;
  monthIndex: number; // 0-11
  currentRevenue: number;
  addedRevenue: number;
  totalRevenue: number;
  shiftsCount: number;
  hoursWorked: number;
  minimumGoalProgress: number; // 0-100
  idealGoalProgress: number; // 0-100
  minimumGoalGap: number;
  idealGoalGap: number;
  suggestedExtraShifts: number;
}

export interface ScenarioSummary {
  totalAddedRevenue: number;
  avgMonthlyIncome: number;
  monthsToMinGoal: number | null; // null = never met
  monthsToIdealGoal: number | null;
}

export interface ScenarioResult {
  monthlyBreakdown: MonthBreakdown[];
  summary: ScenarioSummary;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MAX_HYPOTHETICAL = 10;

export const SHIFT_TYPE_HOURS: Record<string, number> = {
  TWELVE_DAY: 12,
  TWELVE_NIGHT: 12,
  TWENTY_FOUR: 24,
  TWENTY_FOUR_INVERTED: 24,
};

export class ScenarioEngine {
  static calculate(input: ScenarioInput): ScenarioResult {
    const now = input.referenceDate ?? new Date();
    const hypo = input.hypotheticalShifts.slice(0, MAX_HYPOTHETICAL);
    const { projectionMonths, minimumMonthlyGoal, idealMonthlyGoal, averageShiftValue } = input;

    // Group existing shifts by month
    const existingByMonth = this.groupByMonth(input.existingShifts);
    const hypoByMonth = this.groupByMonth(hypo);

    // Calculate current month pace for projections
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const currentExisting = existingByMonth.get(currentMonthKey);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(1, now.getDate());
    const monthlyPace = currentExisting
      ? (currentExisting.revenue / daysPassed) * daysInMonth
      : averageShiftValue * 4; // fallback: ~4 shifts

    const monthlyBreakdown: MonthBreakdown[] = [];
    let totalAdded = 0;
    let totalIncome = 0;

    for (let i = 0; i < projectionMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const yr = d.getFullYear().toString().slice(-2);
      const label = `${MONTH_NAMES[d.getMonth()]}/${yr}`;

      const existing = existingByMonth.get(key) || { revenue: 0, shifts: 0, hours: 0 };
      const added = hypoByMonth.get(key) || { revenue: 0, shifts: 0, hours: 0 };

      // For current month: use actual data. Future months: use pace projection
      const currentRev = i === 0 ? existing.revenue : monthlyPace;
      const addedRev = added.revenue;
      const totalRev = currentRev + addedRev;
      const totalShifts =
        (i === 0 ? existing.shifts : Math.round(monthlyPace / (averageShiftValue || 1))) + added.shifts;
      const totalHours = (i === 0 ? existing.hours : 0) + added.hours;

      totalAdded += addedRev;
      totalIncome += totalRev;

      const minProgress = minimumMonthlyGoal > 0 ? Math.min(100, (totalRev / minimumMonthlyGoal) * 100) : 100;
      const idealProgress = idealMonthlyGoal > 0 ? Math.min(100, (totalRev / idealMonthlyGoal) * 100) : 100;
      const idealGap = Math.max(0, idealMonthlyGoal - totalRev);
      const minGap = Math.max(0, minimumMonthlyGoal - totalRev);

      monthlyBreakdown.push({
        month: label,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        currentRevenue: Math.round(currentRev * 100) / 100,
        addedRevenue: Math.round(addedRev * 100) / 100,
        totalRevenue: Math.round(totalRev * 100) / 100,
        shiftsCount: totalShifts,
        hoursWorked: totalHours,
        minimumGoalProgress: Math.round(minProgress * 10) / 10,
        idealGoalProgress: Math.round(idealProgress * 10) / 10,
        minimumGoalGap: Math.round(minGap * 100) / 100,
        idealGoalGap: Math.round(idealGap * 100) / 100,
        suggestedExtraShifts: averageShiftValue > 0 ? Math.ceil(idealGap / averageShiftValue) : 0,
      });
    }

    // Summary
    const avgMonthly = projectionMonths > 0 ? totalIncome / projectionMonths : 0;
    const monthsToMin = monthlyBreakdown.findIndex((m) => m.minimumGoalProgress >= 100);
    const monthsToIdeal = monthlyBreakdown.findIndex((m) => m.idealGoalProgress >= 100);

    return {
      monthlyBreakdown,
      summary: {
        totalAddedRevenue: Math.round(totalAdded * 100) / 100,
        avgMonthlyIncome: Math.round(avgMonthly * 100) / 100,
        monthsToMinGoal: monthsToMin >= 0 ? monthsToMin + 1 : null,
        monthsToIdealGoal: monthsToIdeal >= 0 ? monthsToIdeal + 1 : null,
      },
    };
  }

  private static groupByMonth(
    shifts: ScenarioShift[],
  ): Map<string, { revenue: number; shifts: number; hours: number }> {
    const map = new Map<string, { revenue: number; shifts: number; hours: number }>();
    for (const s of shifts) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = map.get(key) || { revenue: 0, shifts: 0, hours: 0 };
      entry.revenue += s.value;
      entry.shifts++;
      entry.hours += s.hours;
      map.set(key, entry);
    }
    return map;
  }
}
