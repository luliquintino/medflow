/**
 * Benchmarking Engine
 * Pure business logic — no database, no HTTP, fully testable.
 * Compares the user's own performance across time periods and against goals.
 */

export interface MonthlyData {
  month: number; // 0-11
  year: number;
  revenue: number;
  hours: number;
  shiftsCount: number;
}

export interface FinancialGoals {
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
}

export interface PeriodSnapshot {
  revenue: number;
  hours: number;
  shiftsCount: number;
  revenuePerHour: number;
}

export type Trend = 'rising' | 'stable' | 'falling';

export interface DeltaPercent {
  revenue: number;
  hours: number;
  revenuePerHour: number;
}

export interface GoalComparison {
  gap: number;
  progress: number; // 0-100
  onTrack: boolean;
}

export interface BenchmarkingResult {
  snapshots: {
    currentMonth: PeriodSnapshot;
    previousMonth: PeriodSnapshot;
    threeMonthAvg: PeriodSnapshot;
    sixMonthAvg: PeriodSnapshot;
  };
  deltas: {
    vsLastMonth: DeltaPercent;
    vsThreeMonthAvg: DeltaPercent;
  };
  goals: {
    vsMinimumGoal: GoalComparison;
    vsIdealGoal: GoalComparison;
  };
  trends: {
    revenuePerHour: Trend;
    workload: Trend;
    goalAttainment: Trend;
  };
}

const EMPTY_SNAPSHOT: PeriodSnapshot = {
  revenue: 0,
  hours: 0,
  shiftsCount: 0,
  revenuePerHour: 0,
};

const EMPTY_DELTA: DeltaPercent = {
  revenue: 0,
  hours: 0,
  revenuePerHour: 0,
};

export class BenchmarkingEngine {
  /**
   * Main calculation entry point.
   * @param data Monthly data sorted oldest-to-newest, up to 6 months. Last element = current month.
   * @param goals Financial goals for comparison.
   */
  static calculate(
    data: MonthlyData[],
    goals: FinancialGoals,
  ): BenchmarkingResult {
    if (data.length === 0) {
      return this.emptyResult(goals);
    }

    // Ensure we have at most 6 months, take the most recent ones
    const months = data.slice(-6);

    // --- Period Snapshots ---
    const currentMonth = this.toSnapshot(months[months.length - 1]);
    const previousMonth =
      months.length >= 2
        ? this.toSnapshot(months[months.length - 2])
        : { ...EMPTY_SNAPSHOT };

    const threeMonthAvg = this.averageSnapshot(months.slice(-3));
    const sixMonthAvg = this.averageSnapshot(months);

    // --- Deltas ---
    const vsLastMonth =
      months.length >= 2
        ? this.computeDelta(currentMonth, previousMonth)
        : { ...EMPTY_DELTA };

    const vsThreeMonthAvg =
      months.length >= 2
        ? this.computeDelta(currentMonth, threeMonthAvg)
        : { ...EMPTY_DELTA };

    // --- Goal Comparison ---
    const revenuePerHourTrend = this.computeTrend(months, 'revenuePerHour');
    const workloadTrend = this.computeTrend(months, 'workload');

    const vsMinimumGoal = this.computeGoalComparison(
      currentMonth,
      goals.minimumMonthlyGoal,
      revenuePerHourTrend,
    );
    const vsIdealGoal = this.computeGoalComparison(
      currentMonth,
      goals.idealMonthlyGoal,
      revenuePerHourTrend,
    );

    // --- Trends ---
    const goalAttainmentTrend = this.computeGoalAttainmentTrend(
      months,
      goals.idealMonthlyGoal,
    );

    return {
      snapshots: {
        currentMonth,
        previousMonth,
        threeMonthAvg,
        sixMonthAvg,
      },
      deltas: {
        vsLastMonth,
        vsThreeMonthAvg,
      },
      goals: {
        vsMinimumGoal,
        vsIdealGoal,
      },
      trends: {
        revenuePerHour: revenuePerHourTrend,
        workload: workloadTrend,
        goalAttainment: goalAttainmentTrend,
      },
    };
  }

  // --- Private helpers ---

  private static toSnapshot(m: MonthlyData): PeriodSnapshot {
    return {
      revenue: round2(m.revenue),
      hours: round2(m.hours),
      shiftsCount: m.shiftsCount,
      revenuePerHour: m.hours > 0 ? round2(m.revenue / m.hours) : 0,
    };
  }

  private static averageSnapshot(months: MonthlyData[]): PeriodSnapshot {
    if (months.length === 0) return { ...EMPTY_SNAPSHOT };

    const n = months.length;
    const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const totalHours = months.reduce((s, m) => s + m.hours, 0);
    const totalShifts = months.reduce((s, m) => s + m.shiftsCount, 0);

    const avgRevenue = totalRevenue / n;
    const avgHours = totalHours / n;
    const avgShifts = totalShifts / n;

    return {
      revenue: round2(avgRevenue),
      hours: round2(avgHours),
      shiftsCount: Math.round(avgShifts),
      revenuePerHour: avgHours > 0 ? round2(avgRevenue / avgHours) : 0,
    };
  }

  private static computeDelta(
    current: PeriodSnapshot,
    baseline: PeriodSnapshot,
  ): DeltaPercent {
    return {
      revenue: pctChange(current.revenue, baseline.revenue),
      hours: pctChange(current.hours, baseline.hours),
      revenuePerHour: pctChange(
        current.revenuePerHour,
        baseline.revenuePerHour,
      ),
    };
  }

  private static computeGoalComparison(
    current: PeriodSnapshot,
    goal: number,
    revPerHourTrend: Trend,
  ): GoalComparison {
    if (goal <= 0) {
      return { gap: 0, progress: 100, onTrack: true };
    }

    const gap = round2(Math.max(0, goal - current.revenue));
    const progress = round2(Math.min(100, (current.revenue / goal) * 100));
    const onTrack =
      current.revenue >= goal ||
      (revPerHourTrend === 'rising' && progress > 70);

    return { gap, progress, onTrack };
  }

  /**
   * Trend logic: compare last 3 months avg vs previous 3 months avg.
   * >10% up = "rising", >10% down = "falling", else "stable".
   * If < 4 months of data, fall back to last 2 vs previous 2 (or return "stable").
   */
  private static computeTrend(
    months: MonthlyData[],
    metric: 'revenuePerHour' | 'workload',
  ): Trend {
    if (months.length < 2) return 'stable';

    const getValue = (m: MonthlyData): number => {
      if (metric === 'revenuePerHour') {
        return m.hours > 0 ? m.revenue / m.hours : 0;
      }
      // workload = hours
      return m.hours;
    };

    // Split into recent half and older half
    const mid = Math.floor(months.length / 2);
    const olderHalf = months.slice(0, mid);
    const recentHalf = months.slice(mid);

    const olderAvg = avg(olderHalf.map(getValue));
    const recentAvg = avg(recentHalf.map(getValue));

    if (olderAvg === 0 && recentAvg === 0) return 'stable';
    if (olderAvg === 0) return 'rising';

    const change = (recentAvg - olderAvg) / olderAvg;
    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'falling';
    return 'stable';
  }

  /**
   * Goal attainment trend: looks at how close each month was to the ideal goal
   * and determines direction.
   */
  private static computeGoalAttainmentTrend(
    months: MonthlyData[],
    idealGoal: number,
  ): Trend {
    if (months.length < 2 || idealGoal <= 0) return 'stable';

    const attainments = months.map((m) =>
      Math.min(100, (m.revenue / idealGoal) * 100),
    );

    const mid = Math.floor(attainments.length / 2);
    const olderAvg = avg(attainments.slice(0, mid));
    const recentAvg = avg(attainments.slice(mid));

    if (olderAvg === 0 && recentAvg === 0) return 'stable';
    if (olderAvg === 0) return 'rising';

    const change = (recentAvg - olderAvg) / olderAvg;
    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'falling';
    return 'stable';
  }

  private static emptyResult(goals: FinancialGoals): BenchmarkingResult {
    return {
      snapshots: {
        currentMonth: { ...EMPTY_SNAPSHOT },
        previousMonth: { ...EMPTY_SNAPSHOT },
        threeMonthAvg: { ...EMPTY_SNAPSHOT },
        sixMonthAvg: { ...EMPTY_SNAPSHOT },
      },
      deltas: {
        vsLastMonth: { ...EMPTY_DELTA },
        vsThreeMonthAvg: { ...EMPTY_DELTA },
      },
      goals: {
        vsMinimumGoal: {
          gap: goals.minimumMonthlyGoal,
          progress: 0,
          onTrack: false,
        },
        vsIdealGoal: {
          gap: goals.idealMonthlyGoal,
          progress: 0,
          onTrack: false,
        },
      },
      trends: {
        revenuePerHour: 'stable',
        workload: 'stable',
        goalAttainment: 'stable',
      },
    };
  }
}

// --- Utility functions ---

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctChange(current: number, baseline: number): number {
  if (baseline === 0 && current === 0) return 0;
  if (baseline === 0) return 100;
  return round2(((current - baseline) / baseline) * 100);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
