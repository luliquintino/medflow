/**
 * Optimization Engine
 * Motor de otimizacao de plantoes — pura logica de negocio.
 * Usa sustainability index para ranquear cenarios.
 * Sem dependencias de NestJS, HTTP ou banco de dados.
 */

import { EnergyCosts, DEFAULT_ENERGY_COSTS, WorkloadEngine } from '../shifts/shifts.engine';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface OptimizationInput {
  idealMonthlyGoal: number;
  confirmedRevenueThisMonth: number;
  confirmedShifts: Array<{
    date: Date;
    endDate: Date;
    hours: number;
    value: number;
    isNightShift: boolean;
  }>;
  availableTemplates: Array<{
    id: string;
    hospitalName: string;
    type: string;
    durationInHours: number;
    defaultValue: number;
    isNightShift: boolean;
  }>;
  riskLimits: {
    maxWeeklyHours: number;
    maxConsecutiveNights: number;
    maxHoursIn5Days: number;
  };
  daysRemainingInMonth: number;
  today: Date;
  energyCosts: EnergyCosts;
}

export interface OptimizationScenario {
  description: string;
  shifts: Array<{
    templateId: string;
    hospitalName: string;
    suggestedDate: Date;
    durationInHours: number;
    value: number;
    isNightShift: boolean;
  }>;
  totalShifts: number;
  totalHours: number;
  totalIncome: number;
  totalExhaustion: number;
  sustainabilityIndex: number;
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH';
  optimizationScore: number; // 0-100
}

export interface OptimizationResult {
  financialGap: number;
  currentRevenue: number;
  targetRevenue: number;
  gapPercentage: number;
  isGoalAlreadyMet: boolean;
  suggestedScenarios: OptimizationScenario[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getShiftType(
  isNight: boolean,
  hours: number,
): 'TWELVE_HOURS' | 'TWENTY_FOUR_HOURS' | 'NIGHT' {
  if (isNight) return 'NIGHT';
  if (hours === 24) return 'TWENTY_FOUR_HOURS';
  return 'TWELVE_HOURS';
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class OptimizationEngine {
  static optimize(input: OptimizationInput): OptimizationResult {
    const gap = input.idealMonthlyGoal - input.confirmedRevenueThisMonth;

    if (gap <= 0) {
      return {
        financialGap: 0,
        currentRevenue: input.confirmedRevenueThisMonth,
        targetRevenue: input.idealMonthlyGoal,
        gapPercentage: 0,
        isGoalAlreadyMet: true,
        suggestedScenarios: [],
      };
    }

    const gapPercentage =
      input.idealMonthlyGoal > 0 ? Math.round((gap / input.idealMonthlyGoal) * 100) : 0;

    const freeDays = this.findFreeDays(input);

    if (freeDays.length === 0 || input.availableTemplates.length === 0) {
      return {
        financialGap: gap,
        currentRevenue: input.confirmedRevenueThisMonth,
        targetRevenue: input.idealMonthlyGoal,
        gapPercentage,
        isGoalAlreadyMet: false,
        suggestedScenarios: [],
      };
    }

    const scenarios: OptimizationScenario[] = [];

    for (const template of input.availableTemplates) {
      const scenario = this.buildSingleTemplateScenario(template, gap, freeDays, input);
      if (scenario) scenarios.push(scenario);
    }

    if (input.availableTemplates.length >= 2) {
      for (let i = 0; i < input.availableTemplates.length; i++) {
        for (let j = i + 1; j < input.availableTemplates.length; j++) {
          const scenario = this.buildMixedScenario(
            input.availableTemplates[i],
            input.availableTemplates[j],
            gap,
            freeDays,
            input,
          );
          if (scenario) scenarios.push(scenario);
        }
      }
    }

    const filtered = scenarios.filter((s) => s.riskLevel !== 'HIGH');
    filtered.sort((a, b) => b.optimizationScore - a.optimizationScore);

    return {
      financialGap: gap,
      currentRevenue: input.confirmedRevenueThisMonth,
      targetRevenue: input.idealMonthlyGoal,
      gapPercentage,
      isGoalAlreadyMet: false,
      suggestedScenarios: filtered.slice(0, 5),
    };
  }

  // ─── Dias livres ─────────────────────────────────────────────────────────

  private static findFreeDays(input: OptimizationInput): Date[] {
    const freeDays: Date[] = [];
    const today = new Date(input.today);
    today.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    for (let d = addDays(today, 1); d <= endOfMonth; d = addDays(d, 1)) {
      const candidate = new Date(d);
      candidate.setHours(0, 0, 0, 0);

      const hasShift = input.confirmedShifts.some((s) => isSameDay(new Date(s.date), candidate));
      if (hasShift) continue;

      const hasAdjacentConflict = input.confirmedShifts.some((s) => {
        const shiftEnd = new Date(s.endDate).getTime();
        const shiftStart = new Date(s.date).getTime();
        const candidateStart = candidate.getTime();
        const candidateEnd = candidateStart + 24 * 60 * 60 * 1000;

        const gapAfter = (candidateStart - shiftEnd) / (60 * 60 * 1000);
        const gapBefore = (shiftStart - candidateEnd) / (60 * 60 * 1000);

        return (gapAfter >= 0 && gapAfter < 24) || (gapBefore >= 0 && gapBefore < 24);
      });

      if (!hasAdjacentConflict) freeDays.push(candidate);
    }

    return freeDays;
  }

  // ─── Cenario com template unico ──────────────────────────────────────────

  private static buildSingleTemplateScenario(
    template: OptimizationInput['availableTemplates'][0],
    gap: number,
    freeDays: Date[],
    input: OptimizationInput,
  ): OptimizationScenario | null {
    const shiftsNeeded = Math.ceil(gap / template.defaultValue);
    const actualShifts = Math.min(shiftsNeeded, freeDays.length);
    if (actualShifts === 0) return null;

    const selectedDays = this.distributeShifts(
      freeDays,
      actualShifts,
      template.isNightShift,
      input,
    );
    const shifts = selectedDays.map((day) => ({
      templateId: template.id,
      hospitalName: template.hospitalName,
      suggestedDate: day,
      durationInHours: template.durationInHours,
      value: template.defaultValue,
      isNightShift: template.isNightShift,
    }));

    const totalHours = actualShifts * template.durationInHours;
    const totalIncome = actualShifts * template.defaultValue;

    const { totalExhaustion, sustainabilityIndex } = this.calculateScenarioExhaustion(
      shifts,
      input,
    );
    const riskLevel = this.assessRisk(shifts, input);
    const score = this.calculateScore(
      totalIncome,
      gap,
      totalExhaustion,
      sustainabilityIndex,
      shifts,
      input,
    );

    const tipoPlantao = template.isNightShift ? 'noturnos' : 'diurnos';
    const duracao = `${template.durationInHours}h`;
    const description = `${actualShifts} ${actualShifts === 1 ? 'plantao' : 'plantoes'} ${tipoPlantao} ${duracao} no ${template.hospitalName}`;

    return {
      description,
      shifts,
      totalShifts: actualShifts,
      totalHours,
      totalIncome,
      totalExhaustion,
      sustainabilityIndex,
      riskLevel,
      optimizationScore: score,
    };
  }

  // ─── Cenario misto (2 templates) ─────────────────────────────────────────

  private static buildMixedScenario(
    templateA: OptimizationInput['availableTemplates'][0],
    templateB: OptimizationInput['availableTemplates'][0],
    gap: number,
    freeDays: Date[],
    input: OptimizationInput,
  ): OptimizationScenario | null {
    const avgValue = (templateA.defaultValue + templateB.defaultValue) / 2;
    const totalNeeded = Math.ceil(gap / avgValue);
    const actualTotal = Math.min(totalNeeded, freeDays.length);
    if (actualTotal < 2) return null;

    const moreValuable = templateA.defaultValue >= templateB.defaultValue ? templateA : templateB;
    const lessValuable = templateA.defaultValue >= templateB.defaultValue ? templateB : templateA;

    const countMore = Math.ceil(actualTotal * 0.6);
    const countLess = actualTotal - countMore;
    if (countLess === 0) return null;

    const allSelectedDays = this.distributeShifts(freeDays, actualTotal, false, input);
    const shifts: OptimizationScenario['shifts'] = [];

    for (let i = 0; i < allSelectedDays.length; i++) {
      const template = i < countMore ? moreValuable : lessValuable;
      shifts.push({
        templateId: template.id,
        hospitalName: template.hospitalName,
        suggestedDate: allSelectedDays[i],
        durationInHours: template.durationInHours,
        value: template.defaultValue,
        isNightShift: template.isNightShift,
      });
    }

    const totalHours = shifts.reduce((s, sh) => s + sh.durationInHours, 0);
    const totalIncome = shifts.reduce((s, sh) => s + sh.value, 0);
    const { totalExhaustion, sustainabilityIndex } = this.calculateScenarioExhaustion(
      shifts,
      input,
    );
    const riskLevel = this.assessRisk(shifts, input);
    const score = this.calculateScore(
      totalIncome,
      gap,
      totalExhaustion,
      sustainabilityIndex,
      shifts,
      input,
    );

    const tipoMore = moreValuable.isNightShift ? 'noturnos' : 'diurnos';
    const tipoLess = lessValuable.isNightShift ? 'noturnos' : 'diurnos';

    const description =
      moreValuable.hospitalName === lessValuable.hospitalName
        ? `${countMore} ${tipoMore} + ${countLess} ${tipoLess} no ${moreValuable.hospitalName}`
        : `${countMore} ${tipoMore} no ${moreValuable.hospitalName} + ${countLess} ${tipoLess} na ${lessValuable.hospitalName}`;

    return {
      description,
      shifts,
      totalShifts: actualTotal,
      totalHours,
      totalIncome,
      totalExhaustion,
      sustainabilityIndex,
      riskLevel,
      optimizationScore: score,
    };
  }

  // ─── Distribuir plantoes nos dias livres ─────────────────────────────────

  private static distributeShifts(
    freeDays: Date[],
    count: number,
    isNight: boolean,
    input: OptimizationInput,
  ): Date[] {
    if (count >= freeDays.length) return [...freeDays];
    const step = freeDays.length / count;
    const selected: Date[] = [];
    for (let i = 0; i < count; i++) {
      selected.push(freeDays[Math.min(Math.floor(i * step), freeDays.length - 1)]);
    }
    return selected;
  }

  // ─── Exhaustion do cenário ─────────────────────────────────────────────

  private static calculateScenarioExhaustion(
    newShifts: OptimizationScenario['shifts'],
    input: OptimizationInput,
  ): { totalExhaustion: number; sustainabilityIndex: number } {
    const allShifts = [
      ...input.confirmedShifts.map((s) => ({
        id: 'existing',
        date: new Date(s.date),
        endDate: new Date(s.endDate),
        type: getShiftType(s.isNightShift, s.hours),
        hours: s.hours,
        value: s.value,
        location: '',
        status: 'CONFIRMED' as const,
      })),
      ...newShifts.map((s) => ({
        id: 'proposed',
        date: new Date(s.suggestedDate),
        endDate: new Date(new Date(s.suggestedDate).getTime() + s.durationInHours * 3600000),
        type: getShiftType(s.isNightShift, s.durationInHours),
        hours: s.durationInHours,
        value: s.value,
        location: '',
        status: 'CONFIRMED' as const,
      })),
    ];

    const result = WorkloadEngine.calculateExhaustion(allShifts, input.energyCosts);
    const totalIncome = allShifts.reduce((sum, s) => sum + s.value, 0);
    const sustainabilityIndex =
      result.totalExhaustion > 0 ? Math.round(totalIncome / result.totalExhaustion) : 0;

    return { totalExhaustion: result.totalExhaustion, sustainabilityIndex };
  }

  // ─── Avaliacao de risco ──────────────────────────────────────────────────

  private static assessRisk(
    newShifts: OptimizationScenario['shifts'],
    input: OptimizationInput,
  ): 'SAFE' | 'MODERATE' | 'HIGH' {
    const allShifts = [
      ...input.confirmedShifts.map((s) => ({
        date: new Date(s.date),
        endDate: new Date(s.endDate),
        hours: s.hours,
        isNightShift: s.isNightShift,
      })),
      ...newShifts.map((s) => ({
        date: new Date(s.suggestedDate),
        endDate: new Date(new Date(s.suggestedDate).getTime() + s.durationInHours * 3600000),
        hours: s.durationInHours,
        isNightShift: s.isNightShift,
      })),
    ];

    allShifts.sort((a, b) => a.date.getTime() - b.date.getTime());

    const weeklyHoursMap = new Map<number, number>();
    for (const shift of allShifts) {
      const week = getWeekNumber(shift.date);
      weeklyHoursMap.set(week, (weeklyHoursMap.get(week) || 0) + shift.hours);
    }
    const maxWeeklyHours = Math.max(...Array.from(weeklyHoursMap.values()), 0);

    let maxConsecutiveNights = 0;
    let currentConsecutiveNights = 0;
    for (const shift of allShifts) {
      if (shift.isNightShift) {
        currentConsecutiveNights++;
        maxConsecutiveNights = Math.max(maxConsecutiveNights, currentConsecutiveNights);
      } else {
        currentConsecutiveNights = 0;
      }
    }

    let maxHoursIn5Days = 0;
    for (let i = 0; i < allShifts.length; i++) {
      const windowEnd = new Date(allShifts[i].date);
      windowEnd.setDate(windowEnd.getDate() + 5);
      const hoursInWindow = allShifts
        .filter((s) => s.date >= allShifts[i].date && s.date < windowEnd)
        .reduce((sum, s) => sum + s.hours, 0);
      maxHoursIn5Days = Math.max(maxHoursIn5Days, hoursInWindow);
    }

    const limits = input.riskLimits;
    if (
      maxWeeklyHours > limits.maxWeeklyHours ||
      maxConsecutiveNights > limits.maxConsecutiveNights ||
      maxHoursIn5Days > limits.maxHoursIn5Days
    ) {
      return 'HIGH';
    }
    if (
      maxWeeklyHours > limits.maxWeeklyHours * 0.8 ||
      maxConsecutiveNights >= limits.maxConsecutiveNights ||
      maxHoursIn5Days > limits.maxHoursIn5Days * 0.8
    ) {
      return 'MODERATE';
    }
    return 'SAFE';
  }

  // ─── Score de otimizacao (sustainability-aware) ────────────────────────

  private static calculateScore(
    totalIncome: number,
    gap: number,
    totalExhaustion: number,
    sustainabilityIndex: number,
    shifts: OptimizationScenario['shifts'],
    input: OptimizationInput,
  ): number {
    // 1. Cobertura da meta: ate 30 pontos
    const goalCoverage = Math.min(totalIncome / gap, 1) * 30;

    // 2. Sustentabilidade: ate 30 pontos
    const avgCost =
      (input.energyCosts.diurno + input.energyCosts.noturno + input.energyCosts.h24) / 3;
    const bestValue = Math.max(...input.availableTemplates.map((t) => t.defaultValue), 1);
    const benchmark = bestValue / avgCost;
    const sustainabilityScore = Math.min(sustainabilityIndex / benchmark, 1) * 30;

    // 3. Saúde energética: ate 20 pontos
    const exhaustionHealth = Math.max(0, 1 - totalExhaustion / 10) * 20;

    // 4. Eficiência: ate 20 pontos
    const efficiency = Math.max(0, 1 - shifts.length / 10) * 20;

    return Math.round(goalCoverage + sustainabilityScore + exhaustionHealth + efficiency);
  }
}
