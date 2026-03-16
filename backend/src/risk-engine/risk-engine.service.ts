import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngine, RiskInput } from './risk.engine';
import { WorkloadEngine, EnergyCosts, DEFAULT_ENERGY_COSTS } from '../shifts/shifts.engine';
import { diffHours } from '../common/utils/date.utils';
import { FlowScore, ShiftType } from '@prisma/client';

@Injectable()
export class RiskEngineService {
  constructor(private prisma: PrismaService) {}

  async evaluate(userId: string) {
    const now = new Date();

    // Fetch all confirmed shifts + work profile
    const [shifts, workProfile] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId, status: 'CONFIRMED' },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workProfile.findUnique({ where: { userId } }),
    ]);

    const energyCosts = this.getEnergyCosts(workProfile);
    // Exclude shifts marked as not realized
    const realizedShifts = shifts.filter((s) => s.realized !== false);
    const workload = WorkloadEngine.calculate(realizedShifts as any, now, energyCosts);

    const lastShift = realizedShifts[realizedShifts.length - 1];
    const hoursSinceLastShift = lastShift ? diffHours(now, lastShift.endDate) : null;

    const input: RiskInput = {
      hoursInLastWeek: workload.totalHoursThisWeek,
      consecutiveNightShifts: workload.consecutiveNightShifts,
      hoursSinceLastShift,
      userMaxWeeklyHours: workProfile?.maxWeeklyHours ?? undefined,
      shifts: realizedShifts as any,
      energyCosts,
      revenueThisMonth: workload.revenueThisMonth,
    };

    const result = RiskEngine.evaluate(input);

    // Persist to risk history — one snapshot per day (upsert)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const existingToday = await this.prisma.riskHistory.findFirst({
      where: { userId, createdAt: { gte: startOfToday } },
    });

    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const snapshotData = {
      riskLevel: result.level as FlowScore,
      riskScore: result.score,
      triggerRules: result.triggeredRules,
      recommendation: result.recommendation,
      periodStart: weekStart,
      periodEnd: now,
      hoursIn5Days: 0,
      hoursInWeek: workload.totalHoursThisWeek,
      consecutiveNights: workload.consecutiveNightShifts,
    };

    if (existingToday) {
      await this.prisma.riskHistory.update({
        where: { id: existingToday.id },
        data: snapshotData,
      });
    } else {
      await this.prisma.riskHistory.create({
        data: { userId, ...snapshotData },
      });
    }

    return {
      ...result,
      workload,
      insights: result.insights,
      evidence: result.evidence,
    };
  }

  async simulateWithShift(
    userId: string,
    hypothetical: { date: string; type: ShiftType; hours: number },
  ) {
    const now = new Date();
    const [shifts, workProfile] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId, status: 'CONFIRMED' },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workProfile.findUnique({ where: { userId } }),
    ]);

    const energyCosts = this.getEnergyCosts(workProfile);
    // Exclude shifts marked as not realized
    const realizedShifts = shifts.filter((s) => s.realized !== false);

    const hyp = {
      date: new Date(hypothetical.date),
      type: hypothetical.type,
      hours: hypothetical.hours,
      value: 0,
    };

    const workloadAfter = WorkloadEngine.calculateWithHypothetical(
      realizedShifts as any,
      hyp,
      now,
      energyCosts,
    );

    const lastShift = realizedShifts[realizedShifts.length - 1];
    const newDate = new Date(hypothetical.date);
    const hoursSinceLastShift = lastShift ? diffHours(newDate, lastShift.endDate) : null;

    // Include the hypothetical shift in the shifts array for exhaustion calculation
    const allShifts = [
      ...realizedShifts,
      {
        date: hyp.date,
        endDate: new Date(hyp.date.getTime() + hyp.hours * 3600000),
        type: hyp.type,
        hours: hyp.hours,
        value: hyp.value,
        status: 'CONFIRMED',
      },
    ];

    const input: RiskInput = {
      hoursInLastWeek: workloadAfter.totalHoursThisWeek,
      consecutiveNightShifts: workloadAfter.consecutiveNightShifts,
      hoursSinceLastShift,
      userMaxWeeklyHours: workProfile?.maxWeeklyHours ?? undefined,
      shifts: allShifts as any,
      energyCosts,
      revenueThisMonth: workloadAfter.revenueThisMonth,
    };

    const result = RiskEngine.evaluate(input);
    return {
      ...result,
      workload: workloadAfter,
      insights: result.insights,
      evidence: result.evidence,
    };
  }

  async getHistory(userId: string, limit = 30) {
    const all = await this.prisma.riskHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // fetch extra to compensate for legacy duplicates
    });

    // Deduplicate: keep only the most recent entry per day
    const seen = new Set<string>();
    const unique = all.filter((r) => {
      const day = r.createdAt.toISOString().slice(0, 10);
      if (seen.has(day)) return false;
      seen.add(day);
      return true;
    });

    return unique.slice(0, limit);
  }

  private getEnergyCosts(workProfile: any): EnergyCosts {
    if (!workProfile) return DEFAULT_ENERGY_COSTS;
    return {
      diurno: workProfile.energyCostDiurno ?? DEFAULT_ENERGY_COSTS.diurno,
      noturno: workProfile.energyCostNoturno ?? DEFAULT_ENERGY_COSTS.noturno,
      h24: workProfile.energyCost24h ?? DEFAULT_ENERGY_COSTS.h24,
      h24Invertido: workProfile.energyCost24hInvertido ?? DEFAULT_ENERGY_COSTS.h24Invertido,
    };
  }
}
