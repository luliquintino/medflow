import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
        email: true,
        avatarUrl: true,
        onboardingCompleted: true,
        createdAt: true,
        financialProfile: {
          include: { installments: true },
        },
        workProfile: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
            trialEndAt: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const { financial, work } = dto;

    // Calculate monthly installment total
    const installmentTotal = (financial.installments || []).reduce(
      (sum, i) => sum + i.monthlyValue,
      0,
    );

    const minimumMonthlyGoal = financial.fixedMonthlyCosts + installmentTotal;
    const idealMonthlyGoal = minimumMonthlyGoal + financial.savingsGoal;

    // Upsert financial profile
    const existingFP = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (existingFP) {
      // Delete old installments
      await this.prisma.installment.deleteMany({
        where: { financialProfileId: existingFP.id },
      });

      await this.prisma.financialProfile.update({
        where: { userId },
        data: {
          fixedMonthlyCosts: financial.fixedMonthlyCosts,
          savingsGoal: financial.savingsGoal,
          averageShiftValue: financial.averageShiftValue,
          minimumMonthlyGoal,
          idealMonthlyGoal,
          installments: {
            create: (financial.installments || []).map((i) => ({
              description: i.description,
              monthlyValue: i.monthlyValue,
              remainingMonths: i.remainingMonths,
              totalValue: i.monthlyValue * i.remainingMonths,
            })),
          },
        },
      });
    } else {
      await this.prisma.financialProfile.create({
        data: {
          userId,
          fixedMonthlyCosts: financial.fixedMonthlyCosts,
          savingsGoal: financial.savingsGoal,
          averageShiftValue: financial.averageShiftValue,
          minimumMonthlyGoal,
          idealMonthlyGoal,
          installments: {
            create: (financial.installments || []).map((i) => ({
              description: i.description,
              monthlyValue: i.monthlyValue,
              remainingMonths: i.remainingMonths,
              totalValue: i.monthlyValue * i.remainingMonths,
            })),
          },
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
      },
      create: {
        userId,
        shiftTypes: work.shiftTypes,
        maxWeeklyHours: work.maxWeeklyHours,
        preferredRestDays: work.preferredRestDays || [],
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
    data: { name?: string; avatarUrl?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Conta excluída com sucesso.' };
  }
}
