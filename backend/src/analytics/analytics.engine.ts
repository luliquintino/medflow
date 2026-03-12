/**
 * Analytics Engine
 * Pure business logic — no database, no HTTP, fully testable.
 * Aggregates shift data into analytics: monthly income, hospital ranking,
 * shift type breakdown, and growth trends.
 */

export interface AnalyticsShift {
  date: Date | string;
  value: number;
  hours: number;
  type: string; // ShiftType enum
  status: string;
  realized?: boolean | null;
  hospitalId?: string | null;
}

export interface AnalyticsHospital {
  id: string;
  name: string;
}

export interface AnalyticsInput {
  shifts: AnalyticsShift[];
  hospitals: AnalyticsHospital[];
  monthsBack: number; // how many months to analyze
}

export interface MonthlyIncome {
  label: string; // "Jan/26"
  year: number;
  month: number; // 0-indexed
  revenue: number;
  shiftCount: number;
  totalHours: number;
}

export interface MonthGrowth {
  label: string;
  growthPercent: number; // MoM %
}

export interface HospitalRank {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  avgPerShift: number;
  shiftCount: number;
  totalHours: number;
  revenueShare: number; // 0-100
}

export interface ShiftTypeIncome {
  type: string;
  typeLabel: string;
  totalRevenue: number;
  shiftCount: number;
  totalHours: number;
  avgPerShift: number;
  avgPerHour: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalShifts: number;
  totalHours: number;
  avgPerShift: number;
  avgPerHour: number;
  bestHospital: string | null;
  overallGrowthPercent: number | null;
}

export interface AnalyticsResult {
  monthlyIncome: MonthlyIncome[];
  monthOverMonthGrowth: MonthGrowth[];
  hospitalRanking: HospitalRank[];
  incomeByShiftType: ShiftTypeIncome[];
  summary: AnalyticsSummary;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const TYPE_LABELS: Record<string, string> = {
  TWELVE_DAY: '12h Diurno',
  TWELVE_NIGHT: '12h Noturno',
  TWENTY_FOUR: '24h',
  TWENTY_FOUR_INVERTED: '24h Invertido',
};

export class AnalyticsEngine {
  static calculate(input: AnalyticsInput): AnalyticsResult {
    const now = new Date();
    const { monthsBack } = input;

    // Filter: only CONFIRMED + realized !== false
    const shifts = input.shifts.filter(
      (s) => s.status === 'CONFIRMED' && s.realized !== false,
    );

    // Build hospital name map
    const hospitalMap = new Map<string, string>();
    for (const h of input.hospitals) {
      hospitalMap.set(h.id, h.name);
    }

    // Determine date range: last N complete months (excluding current)
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    const rangeShifts = shifts.filter((s) => new Date(s.date) >= cutoff);

    const monthlyIncome = this.buildMonthlyIncome(rangeShifts, now, monthsBack);
    const monthOverMonthGrowth = this.buildGrowth(monthlyIncome);
    const hospitalRanking = this.buildHospitalRanking(rangeShifts, hospitalMap);
    const incomeByShiftType = this.buildShiftTypeBreakdown(rangeShifts);
    const summary = this.buildSummary(
      rangeShifts,
      hospitalRanking,
      monthlyIncome,
    );

    return {
      monthlyIncome,
      monthOverMonthGrowth,
      hospitalRanking,
      incomeByShiftType,
      summary,
    };
  }

  private static buildMonthlyIncome(
    shifts: AnalyticsShift[],
    now: Date,
    monthsBack: number,
  ): MonthlyIncome[] {
    // Group shifts by year-month
    const buckets = new Map<string, { revenue: number; count: number; hours: number }>();

    for (const s of shifts) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key) || { revenue: 0, count: 0, hours: 0 };
      bucket.revenue += s.value;
      bucket.count++;
      bucket.hours += s.hours || 0;
      buckets.set(key, bucket);
    }

    // Build ordered list of months
    const result: MonthlyIncome[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key) || { revenue: 0, count: 0, hours: 0 };
      const yr = d.getFullYear().toString().slice(-2);

      result.push({
        label: `${MONTH_NAMES[d.getMonth()]}/${yr}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        revenue: Math.round(bucket.revenue * 100) / 100,
        shiftCount: bucket.count,
        totalHours: bucket.hours,
      });
    }

    return result;
  }

  private static buildGrowth(monthlyIncome: MonthlyIncome[]): MonthGrowth[] {
    const result: MonthGrowth[] = [];

    for (let i = 1; i < monthlyIncome.length; i++) {
      const prev = monthlyIncome[i - 1].revenue;
      const curr = monthlyIncome[i].revenue;
      const growthPercent =
        prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : curr > 0 ? 100 : 0;

      result.push({
        label: monthlyIncome[i].label,
        growthPercent,
      });
    }

    return result;
  }

  private static buildHospitalRanking(
    shifts: AnalyticsShift[],
    hospitalMap: Map<string, string>,
  ): HospitalRank[] {
    const stats = new Map<
      string,
      { revenue: number; count: number; hours: number }
    >();

    for (const s of shifts) {
      if (!s.hospitalId) continue;
      const stat = stats.get(s.hospitalId) || { revenue: 0, count: 0, hours: 0 };
      stat.revenue += s.value;
      stat.count++;
      stat.hours += s.hours || 0;
      stats.set(s.hospitalId, stat);
    }

    const totalRevenue = Array.from(stats.values()).reduce(
      (sum, s) => sum + s.revenue,
      0,
    );

    const ranking: HospitalRank[] = [];
    for (const [id, stat] of stats) {
      ranking.push({
        hospitalId: id,
        hospitalName: hospitalMap.get(id) || 'Desconhecido',
        totalRevenue: Math.round(stat.revenue * 100) / 100,
        avgPerShift: stat.count > 0 ? Math.round((stat.revenue / stat.count) * 100) / 100 : 0,
        shiftCount: stat.count,
        totalHours: stat.hours,
        revenueShare:
          totalRevenue > 0
            ? Math.round((stat.revenue / totalRevenue) * 1000) / 10
            : 0,
      });
    }

    // Sort by totalRevenue descending
    ranking.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return ranking;
  }

  private static buildShiftTypeBreakdown(
    shifts: AnalyticsShift[],
  ): ShiftTypeIncome[] {
    const stats = new Map<
      string,
      { revenue: number; count: number; hours: number }
    >();

    for (const s of shifts) {
      const stat = stats.get(s.type) || { revenue: 0, count: 0, hours: 0 };
      stat.revenue += s.value;
      stat.count++;
      stat.hours += s.hours || 0;
      stats.set(s.type, stat);
    }

    const result: ShiftTypeIncome[] = [];
    for (const [type, stat] of stats) {
      result.push({
        type,
        typeLabel: TYPE_LABELS[type] || type,
        totalRevenue: Math.round(stat.revenue * 100) / 100,
        shiftCount: stat.count,
        totalHours: stat.hours,
        avgPerShift: stat.count > 0 ? Math.round((stat.revenue / stat.count) * 100) / 100 : 0,
        avgPerHour: stat.hours > 0 ? Math.round((stat.revenue / stat.hours) * 100) / 100 : 0,
      });
    }

    // Sort by totalRevenue descending
    result.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return result;
  }

  private static buildSummary(
    shifts: AnalyticsShift[],
    hospitalRanking: HospitalRank[],
    monthlyIncome: MonthlyIncome[],
  ): AnalyticsSummary {
    const totalRevenue = shifts.reduce((sum, s) => sum + s.value, 0);
    const totalHours = shifts.reduce((sum, s) => sum + (s.hours || 0), 0);
    const totalShifts = shifts.length;

    // Overall growth: compare first and last month with revenue
    const nonZeroMonths = monthlyIncome.filter((m) => m.revenue > 0);
    let overallGrowthPercent: number | null = null;
    if (nonZeroMonths.length >= 2) {
      const first = nonZeroMonths[0].revenue;
      const last = nonZeroMonths[nonZeroMonths.length - 1].revenue;
      overallGrowthPercent =
        first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : null;
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalShifts,
      totalHours,
      avgPerShift: totalShifts > 0 ? Math.round((totalRevenue / totalShifts) * 100) / 100 : 0,
      avgPerHour: totalHours > 0 ? Math.round((totalRevenue / totalHours) * 100) / 100 : 0,
      bestHospital: hospitalRanking.length > 0 ? hospitalRanking[0].hospitalName : null,
      overallGrowthPercent,
    };
  }
}
