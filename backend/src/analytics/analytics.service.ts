import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsEngine, AnalyticsResult } from './analytics.engine';

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
}
