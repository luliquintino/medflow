import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OptimizationEngine, OptimizationInput } from './optimization.engine';
import { startOfMonth } from '../common/utils/date.utils';
import { EnergyCosts, DEFAULT_ENERGY_COSTS } from '../shifts/shifts.engine';

@Injectable()
export class OptimizationService {
  constructor(private prisma: PrismaService) {}

  async suggest(userId: string) {
    // 1. Perfil financeiro (meta ideal)
    const financialProfile = await this.prisma.financialProfile.findUnique({
      where: { userId },
    });

    if (!financialProfile) {
      throw new NotFoundException(
        'Perfil financeiro nao encontrado. Complete o onboarding primeiro.',
      );
    }

    const now = new Date();
    const { start, end } = startOfMonth(now);

    // 2. Plantoes confirmados deste mes
    const confirmedShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    const confirmedRevenue = confirmedShifts.reduce((sum, s) => sum + s.value, 0);

    // 3. Hospitais com templates disponiveis para o usuario
    const hospitals = await this.prisma.hospital.findMany({
      where: { userId },
      include: { templates: true },
    });

    const availableTemplates = hospitals.flatMap((hospital) =>
      hospital.templates.map((t) => ({
        id: t.id,
        hospitalName: hospital.name,
        type: t.type,
        durationInHours: t.durationInHours,
        defaultValue: t.defaultValue,
        isNightShift: t.isNightShift,
      })),
    );

    // 4. Perfil de trabalho para limites de risco
    const workProfile = await this.prisma.workProfile.findUnique({
      where: { userId },
    });

    const riskLimits = {
      maxWeeklyHours: workProfile?.maxWeeklyHours ?? 72,
      maxConsecutiveNights: workProfile?.maxConsecutiveNights ?? 2,
      maxHoursIn5Days: 60,
    };

    const energyCosts = this.getEnergyCosts(workProfile);

    // 5. Dias restantes no mes
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemainingInMonth = lastDayOfMonth.getDate() - now.getDate();

    // 6. Montar input e chamar engine
    const input: OptimizationInput = {
      idealMonthlyGoal: financialProfile.idealMonthlyGoal,
      confirmedRevenueThisMonth: confirmedRevenue,
      confirmedShifts: confirmedShifts.map((s) => ({
        date: s.date,
        endDate: s.endDate,
        hours: s.hours,
        value: s.value,
        isNightShift: s.type === 'TWELVE_NIGHT' || s.type === 'TWENTY_FOUR_INVERTED',
      })),
      availableTemplates,
      riskLimits,
      daysRemainingInMonth,
      today: now,
      energyCosts,
    };

    return OptimizationEngine.optimize(input);
  }

  async apply(userId: string, shifts: Array<{ templateId: string; date: string }>) {
    const createdShifts = [];

    for (const item of shifts) {
      // Buscar template com hospital
      const template = await this.prisma.shiftTemplate.findUnique({
        where: { id: item.templateId },
        include: { hospital: true },
      });

      if (!template) {
        throw new NotFoundException(`Template ${item.templateId} nao encontrado.`);
      }

      // Verificar que o hospital pertence ao usuario
      if (template.hospital.userId !== userId) {
        throw new NotFoundException(`Template ${item.templateId} nao pertence ao usuario.`);
      }

      const shiftDate = new Date(item.date);
      const endDate = new Date(shiftDate.getTime() + template.durationInHours * 60 * 60 * 1000);

      // Criar plantao SIMULATED
      const shift = await this.prisma.shift.create({
        data: {
          userId,
          hospitalId: template.hospitalId,
          date: shiftDate,
          endDate,
          type: template.durationInHours === 24
            ? (template.isNightShift ? 'TWENTY_FOUR_INVERTED' : 'TWENTY_FOUR')
            : (template.isNightShift ? 'TWELVE_NIGHT' : 'TWELVE_DAY'),
          hours: template.durationInHours,
          value: template.defaultValue,
          location: template.hospital.name,
          status: 'SIMULATED',
          notes: 'Criado via otimizacao automatica',
        },
      });

      createdShifts.push(shift);
    }

    return {
      created: createdShifts.length,
      shifts: createdShifts,
    };
  }

  private getEnergyCosts(workProfile: any): EnergyCosts {
    if (!workProfile) return DEFAULT_ENERGY_COSTS;
    return {
      diurno: workProfile.energyCostDiurno ?? DEFAULT_ENERGY_COSTS.diurno,
      noturno: workProfile.energyCostNoturno ?? DEFAULT_ENERGY_COSTS.noturno,
      h24: workProfile.energyCost24h ?? DEFAULT_ENERGY_COSTS.h24,
    };
  }
}
