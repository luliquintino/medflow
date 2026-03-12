/**
 * Insights Engine
 * Pure business logic — no database, no HTTP, fully testable.
 * Generates smart financial insights for doctors.
 */

export interface FinanceInsight {
  type: 'positive' | 'warning' | 'info' | 'action';
  icon: string;
  title: string;
  description: string;
  priority: number;
}

interface ShiftData {
  date: Date | string;
  value: number;
  hours: number;
  type: string;
  status: string;
}

interface ProfileData {
  savingsGoal: number;
  averageShiftValue: number;
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
}

interface HospitalData {
  id: string;
  name: string;
  paymentDay: number | null;
}

interface InsightsInput {
  shifts: ShiftData[];
  profile: ProfileData;
  hospitals: HospitalData[];
  currentMonthRevenue: number;
  currentMonthConfirmedShifts: number;
}

export class InsightsEngine {
  static generate(input: InsightsInput): FinanceInsight[] {
    const insights: FinanceInsight[] = [];
    const now = new Date();

    // 1. Goal Pace — Are you on track this month?
    this.goalPaceInsight(input, now, insights);

    // 2. Payment Day Reminders
    this.paymentDayInsights(input, now, insights);

    // 3. Revenue Trend (last 3 months)
    this.revenueTrendInsight(input, now, insights);

    // 4. Shift Type ROI
    this.shiftTypeROIInsight(input, insights);

    // 5. Next Month Readiness
    this.nextMonthReadiness(input, now, insights);

    // 6. Revenue Volatility
    this.revenueVolatilityInsight(input, now, insights);

    return insights.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  private static goalPaceInsight(input: InsightsInput, now: Date, insights: FinanceInsight[]) {
    const { currentMonthRevenue, profile } = input;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (currentMonthRevenue >= profile.idealMonthlyGoal) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: 'Meta ideal atingida!',
        description:
          'Parabéns! Você já alcançou sua meta ideal este mês. Aproveite para descansar.',
        priority: 1,
      });
      return;
    }

    if (currentMonthRevenue >= profile.minimumMonthlyGoal) {
      const remaining = profile.idealMonthlyGoal - currentMonthRevenue;
      const shiftsNeeded = Math.ceil(remaining / (profile.averageShiftValue || 1));
      insights.push({
        type: 'positive',
        icon: '✅',
        title: 'Meta mínima garantida',
        description: `Faltam ${shiftsNeeded} plantão(ões) para a meta ideal. Você tem ${daysInMonth - dayOfMonth} dias restantes.`,
        priority: 2,
      });
      return;
    }

    // Below minimum — calculate pace
    if (dayOfMonth > 1 && currentMonthRevenue > 0) {
      const dailyPace = currentMonthRevenue / dayOfMonth;
      const projectedTotal = dailyPace * daysInMonth;

      if (projectedTotal >= profile.minimumMonthlyGoal) {
        const dayToReach = Math.ceil(profile.minimumMonthlyGoal / dailyPace);
        insights.push({
          type: 'action',
          icon: '📈',
          title: 'Ritmo positivo',
          description: `No ritmo atual, você atinge a meta mínima por volta do dia ${dayToReach}.`,
          priority: 1,
        });
      } else {
        const gap = profile.minimumMonthlyGoal - currentMonthRevenue;
        const shiftsNeeded = Math.ceil(gap / (profile.averageShiftValue || 1));
        const daysLeft = daysInMonth - dayOfMonth;
        insights.push({
          type: 'action',
          icon: '⚡',
          title: 'Acelerar o ritmo',
          description: `Você precisa de mais ${shiftsNeeded} plantão(ões) em ${daysLeft} dias para atingir a meta mínima.`,
          priority: 1,
        });
      }
    }
  }

  private static paymentDayInsights(input: InsightsInput, now: Date, insights: FinanceInsight[]) {
    const dayOfMonth = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const hospital of input.hospitals) {
      if (!hospital.paymentDay) continue;

      // Payment coming in the next 7 days
      const daysUntilPayment = hospital.paymentDay - dayOfMonth;
      if (daysUntilPayment > 0 && daysUntilPayment <= 7) {
        // Calculate revenue from this hospital this month
        const hospitalRevenue = input.shifts
          .filter((s) => {
            const d = new Date(s.date);
            return (
              s.status === 'CONFIRMED' &&
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear &&
              (s as any).hospitalId === hospital.id
            );
          })
          .reduce((sum, s) => sum + s.value, 0);

        if (hospitalRevenue > 0) {
          insights.push({
            type: 'info',
            icon: '💰',
            title: `Pagamento em ${daysUntilPayment} dia(s)`,
            description: `${hospital.name} paga dia ${hospital.paymentDay} — R$ ${hospitalRevenue.toLocaleString('pt-BR')} a receber.`,
            priority: 3,
          });
        }
      }
    }
  }

  private static revenueTrendInsight(input: InsightsInput, now: Date, insights: FinanceInsight[]) {
    // Group confirmed shifts by month
    const monthlyRevenue = new Map<string, number>();

    for (const shift of input.shifts) {
      if (shift.status !== 'CONFIRMED') continue;
      const d = new Date(shift.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + shift.value);
    }

    // Get last 3 complete months (exclude current)
    const months: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const rev = monthlyRevenue.get(key);
      if (rev !== undefined) months.push(rev);
    }

    if (months.length >= 2) {
      const recent = months[0]; // last month
      const older = months[months.length - 1]; // 2-3 months ago
      const change = older > 0 ? ((recent - older) / older) * 100 : 0;

      if (change > 10) {
        insights.push({
          type: 'positive',
          icon: '📈',
          title: 'Receita em alta',
          description: `Sua receita cresceu ${Math.round(change)}% nos últimos ${months.length} meses. Continue assim!`,
          priority: 4,
        });
      } else if (change < -10) {
        insights.push({
          type: 'warning',
          icon: '📉',
          title: 'Receita em queda',
          description: `Sua receita caiu ${Math.round(Math.abs(change))}% nos últimos ${months.length} meses. Considere mais plantões.`,
          priority: 2,
        });
      }
    }
  }

  private static shiftTypeROIInsight(input: InsightsInput, insights: FinanceInsight[]) {
    const typeStats = new Map<string, { totalValue: number; totalHours: number; count: number }>();

    for (const shift of input.shifts) {
      if (shift.status !== 'CONFIRMED' || !shift.hours) continue;
      const stat = typeStats.get(shift.type) || { totalValue: 0, totalHours: 0, count: 0 };
      stat.totalValue += shift.value;
      stat.totalHours += shift.hours;
      stat.count++;
      typeStats.set(shift.type, stat);
    }

    if (typeStats.size < 2) return;

    const typeLabels: Record<string, string> = {
      TWELVE_DAY: '12h Diurno',
      TWELVE_NIGHT: '12h Noturno',
      TWENTY_FOUR: '24h',
      TWENTY_FOUR_INVERTED: '24h Invertido',
    };

    let bestType = '';
    let bestRPH = 0;
    let worstRPH = Infinity;

    for (const [type, stat] of typeStats) {
      if (stat.totalHours === 0) continue;
      const rph = stat.totalValue / stat.totalHours;
      if (rph > bestRPH) {
        bestRPH = rph;
        bestType = type;
      }
      if (rph < worstRPH) worstRPH = rph;
    }

    if (bestType && worstRPH > 0 && bestRPH > worstRPH * 1.15) {
      const diff = Math.round(((bestRPH - worstRPH) / worstRPH) * 100);
      insights.push({
        type: 'info',
        icon: '💡',
        title: 'Melhor retorno por hora',
        description: `${typeLabels[bestType] || bestType} rende ${diff}% mais por hora que outros tipos de plantão.`,
        priority: 5,
      });
    }
  }

  private static nextMonthReadiness(input: InsightsInput, now: Date, insights: FinanceInsight[]) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

    const nextMonthShifts = input.shifts.filter((s) => {
      const d = new Date(s.date);
      return d >= nextMonth && d <= nextMonthEnd && s.status === 'CONFIRMED';
    });

    const avgValue = input.profile.averageShiftValue || 1;
    const shiftsNeeded = Math.ceil(input.profile.minimumMonthlyGoal / avgValue);

    if (nextMonthShifts.length < shiftsNeeded && shiftsNeeded > 0) {
      const missing = shiftsNeeded - nextMonthShifts.length;
      const monthName = nextMonth.toLocaleString('pt-BR', { month: 'long' });
      insights.push({
        type: 'action',
        icon: '📅',
        title: `Planeje ${monthName}`,
        description: `Próximo mês: ${nextMonthShifts.length} plantão(ões) confirmado(s), mas a meta precisa de ${shiftsNeeded}. Faltam ${missing}.`,
        priority: 3,
      });
    }
  }

  private static revenueVolatilityInsight(
    input: InsightsInput,
    now: Date,
    insights: FinanceInsight[],
  ) {
    const monthlyRevenue: number[] = [];

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const rev = input.shifts
        .filter((s) => {
          const sd = new Date(s.date);
          return s.status === 'CONFIRMED' && sd >= d && sd <= monthEnd;
        })
        .reduce((sum, s) => sum + s.value, 0);

      if (rev > 0) monthlyRevenue.push(rev);
    }

    if (monthlyRevenue.length < 3) return;

    const mean = monthlyRevenue.reduce((a, b) => a + b, 0) / monthlyRevenue.length;
    if (mean === 0) return;

    const variance =
      monthlyRevenue.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / monthlyRevenue.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    if (cv > 0.3) {
      insights.push({
        type: 'warning',
        icon: '📊',
        title: 'Receita instável',
        description: `Sua receita variou muito nos últimos meses. Considere plantões fixos para estabilizar.`,
        priority: 5,
      });
    }
  }
}
