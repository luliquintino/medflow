import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngine, RiskInput } from './risk.engine';
import { WorkloadEngine } from '../shifts/shifts.engine';
import { diffHours, subtractDays } from '../common/utils/date.utils';
import { ShiftType } from '@prisma/client';

@Injectable()
export class RiskEngineService {
  constructor(private prisma: PrismaService) {}

  async evaluate(userId: string) {
    const now = new Date();
    const fiveDaysAgo = subtractDays(now, 5);

    // Fetch all confirmed shifts + work profile
    const [shifts, workProfile] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId, status: 'CONFIRMED' },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workProfile.findUnique({ where: { userId } }),
    ]);

    const workload = WorkloadEngine.calculate(shifts as any, now);

    const lastShift = shifts[shifts.length - 1];
    const hoursSinceLastShift = lastShift
      ? diffHours(now, lastShift.endDate)
      : null;

    const input: RiskInput = {
      hoursInLast5Days: workload.hoursInLast5Days,
      hoursInLastWeek: workload.totalHoursThisWeek,
      consecutiveNightShifts: workload.consecutiveNightShifts,
      hoursSinceLastShift,
      userMaxWeeklyHours: workProfile?.maxWeeklyHours ?? undefined,
    };

    const result = RiskEngine.evaluate(input);

    // Persist to risk history
    await this.prisma.riskHistory.create({
      data: {
        userId,
        riskLevel: result.level,
        riskScore: result.score,
        triggerRules: result.triggeredRules,
        recommendation: result.recommendation,
        periodStart: fiveDaysAgo,
        periodEnd: now,
        hoursIn5Days: workload.hoursInLast5Days,
        hoursInWeek: workload.totalHoursThisWeek,
        consecutiveNights: workload.consecutiveNightShifts,
      },
    });

    return { ...result, workload };
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

    const hyp = {
      date: new Date(hypothetical.date),
      type: hypothetical.type,
      hours: hypothetical.hours,
      value: 0,
    };

    const workloadAfter = WorkloadEngine.calculateWithHypothetical(
      shifts as any,
      hyp,
      now,
    );

    const lastShift = shifts[shifts.length - 1];
    const newDate = new Date(hypothetical.date);
    const hoursSinceLastShift = lastShift
      ? diffHours(newDate, lastShift.endDate)
      : null;

    const input: RiskInput = {
      hoursInLast5Days: workloadAfter.hoursInLast5Days,
      hoursInLastWeek: workloadAfter.totalHoursThisWeek,
      consecutiveNightShifts: workloadAfter.consecutiveNightShifts,
      hoursSinceLastShift,
      userMaxWeeklyHours: workProfile?.maxWeeklyHours ?? undefined,
    };

    const result = RiskEngine.evaluate(input);
    return { ...result, workload: workloadAfter };
  }

  async getHistory(userId: string, limit = 30) {
    return this.prisma.riskHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
