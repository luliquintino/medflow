import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createWearableAdapter, WearableProvider } from './wearable.adapter';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class WearableService {
  constructor(private prisma: PrismaService) {}

  private async assertProPlan(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.plan !== SubscriptionPlan.PRO) {
      throw new ForbiddenException(
        'Integração com wearables está disponível apenas no plano Pro.',
      );
    }
  }

  async getLatestData(userId: string) {
    await this.assertProPlan(userId);

    const adapter = createWearableAdapter('mock'); // TODO: load from user settings

    const [hrv, sleep, recovery] = await Promise.all([
      adapter.getHRV(userId),
      adapter.getSleepData(userId),
      adapter.getRecoveryScore(userId),
    ]);

    // Save to DB
    await this.prisma.wearableData.create({
      data: {
        userId,
        source: hrv.source,
        recordedAt: hrv.recordedAt,
        hrv: hrv.value,
        sleepScore: sleep.score,
        sleepHours: sleep.totalHours,
        recoveryScore: recovery.score,
        restingHR: recovery.restingHR,
        stressLevel: recovery.stressLevel,
        rawData: { hrv, sleep, recovery } as any,
      },
    });

    return {
      hrv,
      sleep,
      recovery,
      interpretation: this.interpretData(hrv.value, sleep.score, recovery.score),
    };
  }

  async getHistory(userId: string, days = 7) {
    await this.assertProPlan(userId);

    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.wearableData.findMany({
      where: { userId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  private interpretData(hrv: number, sleepScore: number, recoveryScore: number) {
    const avg = (hrv / 75 + sleepScore / 100 + recoveryScore / 100) / 3;

    if (avg >= 0.75) {
      return {
        status: 'great',
        message: 'Sua recuperação está excelente. Você está pronto para mais plantões.',
      };
    }
    if (avg >= 0.5) {
      return {
        status: 'moderate',
        message: 'Recuperação moderada. Avalie bem antes de aceitar plantões noturnos.',
      };
    }
    return {
      status: 'low',
      message: 'Sua recuperação está baixa. Considere descansar antes do próximo plantão.',
    };
  }
}
