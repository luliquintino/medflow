import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        gender: true,
        email: true,
        avatarUrl: true,
        onboardingCompleted: true,
        createdAt: true,
        financialProfile: true,
        workProfile: true,
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const { financial, work } = dto;

    // Upsert financial profile
    const existingFP = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (existingFP) {
      await this.prisma.financialProfile.update({
        where: { userId },
        data: {
          savingsGoal: financial.savingsGoal,
          averageShiftValue: financial.averageShiftValue,
          minimumMonthlyGoal: financial.minimumMonthlyGoal,
          idealMonthlyGoal: financial.idealMonthlyGoal,
        },
      });
    } else {
      await this.prisma.financialProfile.create({
        data: {
          userId,
          savingsGoal: financial.savingsGoal,
          averageShiftValue: financial.averageShiftValue,
          minimumMonthlyGoal: financial.minimumMonthlyGoal,
          idealMonthlyGoal: financial.idealMonthlyGoal,
        },
      });
    }

    // Upsert work profile
    await this.prisma.workProfile.upsert({
      where: { userId },
      update: {
        shiftTypes: work.shiftTypes,
        maxWeeklyHours: work.maxWeeklyHours,
        preferredRestDays: work.preferredRestDays || [],
        ...(work.energyCostDiurno !== undefined && { energyCostDiurno: work.energyCostDiurno }),
        ...(work.energyCostNoturno !== undefined && { energyCostNoturno: work.energyCostNoturno }),
        ...(work.energyCost24h !== undefined && { energyCost24h: work.energyCost24h }),
        ...(work.energyCost24hInvertido !== undefined && { energyCost24hInvertido: work.energyCost24hInvertido }),
        ...(work.maxNightShifts !== undefined && { maxNightShifts: work.maxNightShifts }),
      },
      create: {
        userId,
        shiftTypes: work.shiftTypes,
        maxWeeklyHours: work.maxWeeklyHours,
        preferredRestDays: work.preferredRestDays || [],
        ...(work.energyCostDiurno !== undefined && { energyCostDiurno: work.energyCostDiurno }),
        ...(work.energyCostNoturno !== undefined && { energyCostNoturno: work.energyCostNoturno }),
        ...(work.energyCost24h !== undefined && { energyCost24h: work.energyCost24h }),
        ...(work.energyCost24hInvertido !== undefined && { energyCost24hInvertido: work.energyCost24hInvertido }),
        ...(work.maxNightShifts !== undefined && { maxNightShifts: work.maxNightShifts }),
      },
    });

    // Mark onboarding as complete
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return this.getMe(userId);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string; gender?: Gender },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, gender: true, email: true, avatarUrl: true },
    });
  }

  async updateWorkProfile(
    userId: string,
    data: {
      maxWeeklyHours?: number;
      preferredRestDays?: number[];
      energyCostDiurno?: number;
      energyCostNoturno?: number;
      energyCost24h?: number;
      energyCost24hInvertido?: number;
      maxNightShifts?: number;
    },
  ) {
    const existing = await this.prisma.workProfile.findUnique({ where: { userId } });
    if (!existing)
      throw new NotFoundException(
        'Perfil de trabalho não encontrado. Complete o onboarding primeiro.',
      );

    return this.prisma.workProfile.update({
      where: { userId },
      data,
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Conta excluída com sucesso.' };
  }
}
