import { Injectable, NotFoundException } from '@nestjs/common';
import { ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceEngine } from './finance.engine';
import { InsightsEngine } from './finance.insights';
import { ScenarioEngine, SHIFT_TYPE_HOURS } from './finance-scenario.engine';
import { SimulateShiftDto } from './dto/simulate-shift.dto';
import { SimulateScenarioDto } from './dto/simulate-scenario.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { startOfMonth } from '../common/utils/date.utils';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, month?: number, year?: number) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const now = new Date();
    const targetDate = month && year ? new Date(year, month - 1, 1) : now;

    const { start, end } = startOfMonth(targetDate);

    const isCurrent =
      targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();
    const isPast = !isCurrent && targetDate < new Date(now.getFullYear(), now.getMonth(), 1);
    const isFuture = !isCurrent && !isPast;

    // Past: only CONFIRMED matters. Current/Future: include SIMULATED too.
    const statusFilter: ShiftStatus[] = isPast
      ? [ShiftStatus.CONFIRMED]
      : [ShiftStatus.CONFIRMED, ShiftStatus.SIMULATED];

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: { in: statusFilter },
        date: { gte: start, lte: end },
      },
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    // Exclude shifts marked as not realized (realized === false) from revenue
    const confirmedShifts = shifts.filter(
      (s) => s.status === 'CONFIRMED' && s.realized !== false,
    );
    const unrealizedShifts = shifts.filter(
      (s) => s.status === 'CONFIRMED' && s.realized === false,
    );
    const simulatedShifts = shifts.filter((s) => s.status === 'SIMULATED');
    const confirmedRevenue = confirmedShifts.reduce((sum, s) => sum + s.value, 0);
    const simulatedRevenue = simulatedShifts.reduce((sum, s) => sum + s.value, 0);
    const unrealizedRevenue = unrealizedShifts.reduce((sum, s) => sum + s.value, 0);

    // Calculate average shift value from ALL confirmed shifts (all-time)
    const allConfirmedShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        realized: { not: false },
      },
      select: { value: true },
    });

    const calculatedAvg =
      allConfirmedShifts.length > 0
        ? allConfirmedShifts.reduce((sum, s) => sum + s.value, 0) / allConfirmedShifts.length
        : profile.averageShiftValue;

    const result = FinanceEngine.calculate({
      minimumMonthlyGoal: profile.minimumMonthlyGoal,
      idealMonthlyGoal: profile.idealMonthlyGoal,
      savingsGoal: profile.savingsGoal,
      averageShiftValue: calculatedAvg,
      confirmedShiftsThisMonth: confirmedShifts.length,
      confirmedRevenueThisMonth: confirmedRevenue,
    });

    // ─── Enhanced Projections (historical 6 months) ─────────────
    let enhancedProjections = null;
    if (!isPast) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const historicalShifts = await this.prisma.shift.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
          realized: { not: false },
          date: { gte: sixMonthsAgo, lt: start },
        },
        select: { date: true, value: true },
        orderBy: { date: 'asc' },
      });

      // Group by month
      const monthBuckets = new Map<string, { month: number; year: number; revenue: number }>();
      for (const s of historicalShifts) {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const entry = monthBuckets.get(key) || { month: d.getMonth(), year: d.getFullYear(), revenue: 0 };
        entry.revenue += s.value;
        monthBuckets.set(key, entry);
      }

      const historicalMonths = Array.from(monthBuckets.values()).sort(
        (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
      );

      enhancedProjections = FinanceEngine.calculateEnhancedProjections({
        historicalMonths,
        projections: result.projections.sixMonths,
        minimumMonthlyGoal: profile.minimumMonthlyGoal,
        idealMonthlyGoal: profile.idealMonthlyGoal,
        averageShiftValue: calculatedAvg,
      });
    }

    return {
      ...result,
      // Skip projections for past months (not actionable)
      projections: isPast ? { threeMonths: [], sixMonths: [] } : result.projections,
      enhancedProjections,
      confirmedShiftsCount: confirmedShifts.length,
      simulatedShiftsCount: simulatedShifts.length,
      unrealizedShiftsCount: unrealizedShifts.length,
      confirmedRevenue,
      simulatedRevenue,
      unrealizedRevenue,
      shifts,
      monthContext: {
        month: targetDate.getMonth() + 1,
        year: targetDate.getFullYear(),
        isPast,
        isCurrent,
        isFuture,
      },
      profile: {
        savingsGoal: profile.savingsGoal,
        averageShiftValue: calculatedAvg,
        minimumMonthlyGoal: profile.minimumMonthlyGoal,
        idealMonthlyGoal: profile.idealMonthlyGoal,
      },
    };
  }

  async getInsights(userId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) return [];

    // Fetch last 6 months of shifts
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Also fetch next month shifts
    const nextMonthEnd = new Date();
    nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 2);
    nextMonthEnd.setDate(0);
    nextMonthEnd.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'SIMULATED'] },
        date: { gte: sixMonthsAgo, lte: nextMonthEnd },
      },
      orderBy: { date: 'asc' },
    });

    const hospitals = await this.prisma.hospital.findMany({
      where: { userId },
      select: { id: true, name: true, paymentDay: true },
    });

    const now = new Date();
    const { start: currentStart, end: currentEnd } = startOfMonth(now);
    const currentMonthShifts = shifts.filter(
      (s) =>
        s.status === 'CONFIRMED' &&
        s.realized !== false &&
        new Date(s.date) >= currentStart &&
        new Date(s.date) <= currentEnd,
    );

    // Exclude unrealized shifts from insights (don't count toward revenue/trends)
    const insightShifts = shifts.filter(
      (s) => !(s.status === 'CONFIRMED' && s.realized === false),
    );

    // Calculate average shift value from all confirmed shifts
    const allConfirmed = await this.prisma.shift.findMany({
      where: { userId, status: 'CONFIRMED', realized: { not: false } },
      select: { value: true },
    });
    const insightAvg =
      allConfirmed.length > 0
        ? allConfirmed.reduce((sum, s) => sum + s.value, 0) / allConfirmed.length
        : profile.averageShiftValue;

    return InsightsEngine.generate({
      shifts: insightShifts,
      profile: {
        savingsGoal: profile.savingsGoal,
        averageShiftValue: insightAvg,
        minimumMonthlyGoal: profile.minimumMonthlyGoal,
        idealMonthlyGoal: profile.idealMonthlyGoal,
      },
      hospitals,
      currentMonthRevenue: currentMonthShifts.reduce((s, sh) => s + sh.value, 0),
      currentMonthConfirmedShifts: currentMonthShifts.length,
    });
  }

  async simulate(userId: string, dto: SimulateShiftDto) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const { start, end } = startOfMonth();

    const allShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        date: { gte: start, lte: end },
      },
    });

    // Exclude shifts marked as not realized
    const shifts = allShifts.filter((s) => s.realized !== false);

    const confirmedRevenue = shifts.reduce((sum, s) => sum + s.value, 0);

    // Calculate average shift value from all confirmed shifts (all-time)
    const allUserConfirmed = await this.prisma.shift.findMany({
      where: { userId, status: 'CONFIRMED', realized: { not: false } },
      select: { value: true },
    });
    const simAvg =
      allUserConfirmed.length > 0
        ? allUserConfirmed.reduce((sum, s) => sum + s.value, 0) / allUserConfirmed.length
        : profile.averageShiftValue;

    const result = FinanceEngine.simulate(
      {
        minimumMonthlyGoal: profile.minimumMonthlyGoal,
        idealMonthlyGoal: profile.idealMonthlyGoal,
        savingsGoal: profile.savingsGoal,
        averageShiftValue: simAvg,
        confirmedShiftsThisMonth: shifts.length,
        confirmedRevenueThisMonth: confirmedRevenue,
      },
      dto.shiftValue,
    );

    return result;
  }

  // ─── Compound Scenario Simulation ──────────────────────────────

  async simulateScenario(userId: string, dto: SimulateScenarioDto) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const { start, end } = startOfMonth();

    const allShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        date: { gte: start, lte: end },
      },
    });

    // Exclude shifts marked as not realized
    const currentShifts = allShifts.filter((s) => s.realized !== false);

    // Calculate average shift value from all confirmed shifts (all-time)
    const allUserConfirmed = await this.prisma.shift.findMany({
      where: { userId, status: 'CONFIRMED', realized: { not: false } },
      select: { value: true },
    });
    const avgValue =
      allUserConfirmed.length > 0
        ? allUserConfirmed.reduce((sum, s) => sum + s.value, 0) / allUserConfirmed.length
        : profile.averageShiftValue;

    // Map existing shifts to ScenarioShift format
    const existingShifts = currentShifts.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      value: s.value,
      hours: s.hours || SHIFT_TYPE_HOURS[s.type] || 12,
      type: s.type,
    }));

    // Map DTO shifts to ScenarioShift format with correct hours
    const hypotheticalShifts = dto.shifts.map((s) => ({
      date: s.date,
      value: s.value,
      hours: SHIFT_TYPE_HOURS[s.type] || 12,
      type: s.type,
    }));

    return ScenarioEngine.calculate({
      existingShifts,
      hypotheticalShifts,
      projectionMonths: dto.projectionMonths,
      minimumMonthlyGoal: profile.minimumMonthlyGoal,
      idealMonthlyGoal: profile.idealMonthlyGoal,
      averageShiftValue: avgValue,
    });
  }

  // ─── Budget Management ──────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateFinancialProfileDto) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const updated = await this.prisma.financialProfile.update({
      where: { userId },
      data: {
        ...(dto.savingsGoal !== undefined && { savingsGoal: dto.savingsGoal }),
        ...(dto.averageShiftValue !== undefined && { averageShiftValue: dto.averageShiftValue }),
        ...(dto.minimumMonthlyGoal !== undefined && { minimumMonthlyGoal: dto.minimumMonthlyGoal }),
        ...(dto.idealMonthlyGoal !== undefined && { idealMonthlyGoal: dto.idealMonthlyGoal }),
      },
    });

    return updated;
  }
}
