import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceEngine } from './finance.engine';
import { SimulateShiftDto } from './dto/simulate-shift.dto';
import { startOfMonth, endOfMonth } from '../common/utils/date.utils';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
      include: { installments: true },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado. Complete o onboarding.');

    const { start, end } = startOfMonth();

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        date: { gte: start, lte: end },
      },
    });

    const installmentMonthlyTotal = profile.installments.reduce(
      (sum, i) => sum + i.monthlyValue,
      0,
    );

    const confirmedRevenue = shifts.reduce((sum, s) => sum + s.value, 0);

    const result = FinanceEngine.calculate({
      fixedMonthlyCosts: profile.fixedMonthlyCosts,
      savingsGoal: profile.savingsGoal,
      averageShiftValue: profile.averageShiftValue,
      installmentMonthlyTotal,
      confirmedShiftsThisMonth: shifts.length,
      confirmedRevenueThisMonth: confirmedRevenue,
    });

    return {
      ...result,
      confirmedShiftsCount: shifts.length,
      profile: {
        fixedMonthlyCosts: profile.fixedMonthlyCosts,
        savingsGoal: profile.savingsGoal,
        averageShiftValue: profile.averageShiftValue,
        installmentMonthlyTotal,
        installments: profile.installments,
      },
    };
  }

  async simulate(userId: string, dto: SimulateShiftDto) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { userId },
      include: { installments: true },
    });

    if (!profile) throw new NotFoundException('Perfil financeiro não encontrado.');

    const { start, end } = startOfMonth();

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        date: { gte: start, lte: end },
      },
    });

    const installmentMonthlyTotal = profile.installments.reduce(
      (sum, i) => sum + i.monthlyValue,
      0,
    );

    const confirmedRevenue = shifts.reduce((sum, s) => sum + s.value, 0);

    const result = FinanceEngine.simulate(
      {
        fixedMonthlyCosts: profile.fixedMonthlyCosts,
        savingsGoal: profile.savingsGoal,
        averageShiftValue: profile.averageShiftValue,
        installmentMonthlyTotal,
        confirmedShiftsThisMonth: shifts.length,
        confirmedRevenueThisMonth: confirmedRevenue,
      },
      dto.shiftValue,
    );

    return result;
  }
}
