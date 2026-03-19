import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsEngine, AnalyticsResult } from './analytics.engine';
import { HospitalRoiEngine, HospitalRoiResult } from './hospital-roi.engine';
import { BenchmarkingEngine, BenchmarkingResult, MonthlyData } from './benchmarking.engine';
import { InsightsEngine, StrategicInsight } from './insights.engine';
import {
  calculateWorkloadMetrics,
  calculateRecoveryDebt,
  calculateFlowScore,
} from '../shifts/flow-score.engine';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(userId: string, monthsBack = 6): Promise<AnalyticsResult> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    cutoffDate.setDate(1);
    cutoffDate.setHours(0, 0, 0, 0);

    const [shifts, hospitals] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
          realized: { not: false },
          date: { gte: cutoffDate },
        },
        select: {
          date: true,
          value: true,
          hours: true,
          type: true,
          status: true,
          realized: true,
          hospitalId: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.hospital.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);

    return AnalyticsEngine.calculate({
      shifts,
      hospitals,
      monthsBack,
    });
  }

  // ─── Hospital ROI ──────────────────────────────────────────────

  async getHospitalRoi(userId: string, monthsBack = 6): Promise<HospitalRoiResult> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    cutoffDate.setDate(1);
    cutoffDate.setHours(0, 0, 0, 0);

    const [shifts, hospitals] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
          realized: { not: false },
          date: { gte: cutoffDate },
        },
        select: {
          date: true,
          value: true,
          hours: true,
          type: true,
          hospitalId: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.hospital.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);

    // Map to RoiShift format (hospitalId required)
    const roiShifts = shifts
      .filter((s) => s.hospitalId)
      .map((s) => ({
        date: s.date,
        value: s.value,
        hours: s.hours || 12,
        type: s.type,
        hospitalId: s.hospitalId!,
      }));

    return HospitalRoiEngine.calculate({
      shifts: roiShifts,
      hospitals,
      now: new Date(),
    });
  }

  // ─── Benchmarking ─────────────────────────────────────────────

  async getBenchmarking(userId: string): Promise<BenchmarkingResult> {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    cutoffDate.setDate(1);
    cutoffDate.setHours(0, 0, 0, 0);

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        realized: { not: false },
        date: { gte: cutoffDate },
      },
      select: { date: true, value: true, hours: true },
      orderBy: { date: 'asc' },
    });

    // Group shifts into monthly data
    const now = new Date();
    const monthlyMap = new Map<string, MonthlyData>();

    // Initialize all 6 months + current month
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, {
        month: d.getMonth(),
        year: d.getFullYear(),
        revenue: 0,
        hours: 0,
        shiftsCount: 0,
      });
    }

    for (const s of shifts) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.revenue += s.value;
        entry.hours += s.hours || 0;
        entry.shiftsCount++;
      }
    }

    // Sort oldest first
    const monthlyData = Array.from(monthlyMap.values()).sort(
      (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
    );

    return BenchmarkingEngine.calculate(monthlyData, {
      minimumMonthlyGoal: profile.minimumMonthlyGoal,
      idealMonthlyGoal: profile.idealMonthlyGoal,
    });
  }

  // ─── Strategic Insights ───────────────────────────────────────

  async getInsights(userId: string): Promise<StrategicInsight[]> {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!profile) return [];

    // Run ROI and Benchmarking in parallel
    const [roiResult, benchmarkingResult] = await Promise.all([
      this.getHospitalRoi(userId, 6),
      this.getBenchmarking(userId),
    ]);

    // Calculate FlowScore for the user
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);

    const recentShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        realized: { not: false },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        date: true,
        endDate: true,
        hours: true,
        type: true,
        value: true,
        status: true,
        realized: true,
        hospitalId: true,
      },
      orderBy: { date: 'asc' },
    });

    // Map to ShiftData format for FlowScore
    const shiftData = recentShifts.map((s) => ({
      id: s.id,
      date: new Date(s.date),
      endDate: new Date(s.endDate),
      hours: s.hours || 12,
      type: s.type as any,
      value: s.value,
      location: s.hospitalId || '',
      status: s.status as any,
      realized: s.realized,
    }));

    const workload = calculateWorkloadMetrics(shiftData, now);
    const recovery = calculateRecoveryDebt(shiftData, now);
    const flowScoreLevel = calculateFlowScore(workload, recovery);

    // Calculate average shift value
    const allConfirmed = await this.prisma.shift.findMany({
      where: { userId, status: 'CONFIRMED', realized: { not: false } },
      select: { value: true },
    });
    const avgValue =
      allConfirmed.length > 0
        ? allConfirmed.reduce((sum, s) => sum + s.value, 0) / allConfirmed.length
        : profile.averageShiftValue;

    return InsightsEngine.generate({
      hospitalRoi: roiResult.hospitals,
      benchmarking: benchmarkingResult,
      flowScoreLevel,
      averageShiftValue: avgValue,
    });
  }
}
