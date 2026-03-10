/**
 * Workload Engine
 * Pure business logic for shift workload calculations.
 * Includes exhaustion score & sustainability index.
 */

import { ShiftType } from '@prisma/client';

// ─── Energy Costs ───────────────────────────────────────────────────────────

export interface EnergyCosts {
  diurno: number; // default 1.0
  noturno: number; // default 1.5
  h24: number; // default 2.5
}

export const DEFAULT_ENERGY_COSTS: EnergyCosts = {
  diurno: 1.0,
  noturno: 1.5,
  h24: 2.5,
};

// ─── Penalty constants ──────────────────────────────────────────────────────

const PENALTY_CONSECUTIVE_SHIFT = 0.5; // < 48h since last shift
const PENALTY_THIRD_CONSECUTIVE_NIGHT = 0.7; // 3rd+ consecutive night
const PENALTY_24H_AFTER_SHIFT = 1.0; // 24h shift < 24h after another
const PENALTY_WEEKLY_OVERLOAD = 0.3; // accumulated >56h in week

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ShiftData {
  id: string;
  date: Date;
  endDate: Date;
  type: ShiftType;
  hours: number;
  value: number;
  location: string;
  status: string;
  realized?: boolean | null;
}

export interface ShiftExhaustion {
  type: string;
  baseCost: number;
  penalties: number;
  totalCost: number;
}

export interface WorkloadSummary {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  hoursInLast5Days: number;
  consecutiveShifts: number;
  consecutiveNightShifts: number;
  shiftsThisMonth: number;
  shiftsThisWeek: number;
  revenueThisMonth: number;
  averageHoursPerShift: number;
  lastShiftEnd: Date | null;
  nextRestDayRecommended: boolean;
  // Exhaustion metrics
  totalExhaustionScore: number;
  averageExhaustionPerShift: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
}

export interface HypotheticalShift {
  date: Date;
  type: ShiftType;
  hours: number;
  value: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBaseCost(type: ShiftType, costs: EnergyCosts): number {
  switch (type) {
    case 'NIGHT':
      return costs.noturno;
    case 'TWENTY_FOUR_HOURS':
      return costs.h24;
    case 'TWELVE_HOURS':
    default:
      return costs.diurno;
  }
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class WorkloadEngine {
  static calculate(
    shifts: ShiftData[],
    now: Date = new Date(),
    energyCosts: EnergyCosts = DEFAULT_ENERGY_COSTS,
  ): WorkloadSummary {
    // Exclude shifts marked as not realized (realized === false) from workload
    const confirmed = shifts.filter((s) => s.status === 'CONFIRMED' && s.realized !== false);
    confirmed.sort((a, b) => a.date.getTime() - b.date.getTime());

    // ── Week boundaries ─────────────────────────────
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // ── Month boundaries ────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // ── Last 5 days ─────────────────────────────────
    const last5Start = new Date(now);
    last5Start.setDate(last5Start.getDate() - 4);
    last5Start.setHours(0, 0, 0, 0);

    const weekShifts = confirmed.filter((s) => s.date >= weekStart && s.date <= weekEnd);
    const monthShifts = confirmed.filter((s) => s.date >= monthStart && s.date <= monthEnd);
    const last5Shifts = confirmed.filter((s) => s.date >= last5Start);

    const totalHoursThisWeek = weekShifts.reduce((s, sh) => s + sh.hours, 0);
    const totalHoursThisMonth = monthShifts.reduce((s, sh) => s + sh.hours, 0);
    const hoursInLast5Days = last5Shifts.reduce((s, sh) => s + sh.hours, 0);
    const revenueThisMonth = monthShifts.reduce((s, sh) => s + sh.value, 0);

    // ── Consecutive shifts ───────────────────────────
    let consecutiveShifts = 0;
    let consecutiveNightShifts = 0;

    if (confirmed.length > 0) {
      const reversed = [...confirmed].reverse();
      let lastEnd: Date | null = null;

      for (const shift of reversed) {
        if (!lastEnd) {
          consecutiveShifts = 1;
          consecutiveNightShifts = shift.type === 'NIGHT' ? 1 : 0;
          lastEnd = shift.endDate;
          continue;
        }

        const gapHours = (lastEnd.getTime() - shift.endDate.getTime()) / 36e5;
        if (gapHours <= 48) {
          consecutiveShifts++;
          if (shift.type === 'NIGHT') consecutiveNightShifts++;
          else consecutiveNightShifts = 0;
          lastEnd = shift.endDate;
        } else {
          break;
        }
      }
    }

    const lastShift = confirmed[confirmed.length - 1] || null;
    const averageHoursPerShift =
      confirmed.length > 0 ? confirmed.reduce((s, sh) => s + sh.hours, 0) / confirmed.length : 0;

    // ── Exhaustion calculation ───────────────────────
    const exhaustionResult = this.calculateExhaustion(monthShifts, energyCosts);
    const totalExhaustionScore = exhaustionResult.totalExhaustion;
    const averageExhaustionPerShift =
      monthShifts.length > 0 ? totalExhaustionScore / monthShifts.length : 0;
    const sustainabilityIndex =
      totalExhaustionScore > 0 ? revenueThisMonth / totalExhaustionScore : 0;

    return {
      totalHoursThisWeek,
      totalHoursThisMonth,
      hoursInLast5Days,
      consecutiveShifts,
      consecutiveNightShifts,
      shiftsThisMonth: monthShifts.length,
      shiftsThisWeek: weekShifts.length,
      revenueThisMonth,
      averageHoursPerShift: Math.round(averageHoursPerShift),
      lastShiftEnd: lastShift?.endDate ?? null,
      nextRestDayRecommended: consecutiveShifts >= 2,
      totalExhaustionScore: Math.round(totalExhaustionScore * 10) / 10,
      averageExhaustionPerShift: Math.round(averageExhaustionPerShift * 10) / 10,
      sustainabilityIndex: Math.round(sustainabilityIndex),
      shiftExhaustionBreakdown: exhaustionResult.breakdown,
    };
  }

  /** Add a hypothetical shift and recalculate */
  static calculateWithHypothetical(
    shifts: ShiftData[],
    hypothetical: HypotheticalShift,
    now: Date = new Date(),
    energyCosts: EnergyCosts = DEFAULT_ENERGY_COSTS,
  ): WorkloadSummary {
    const tempShift: ShiftData = {
      id: 'hypothetical',
      date: hypothetical.date,
      endDate: new Date(hypothetical.date.getTime() + hypothetical.hours * 36e5),
      type: hypothetical.type,
      hours: hypothetical.hours,
      value: hypothetical.value,
      location: '',
      status: 'CONFIRMED',
    };
    return this.calculate([...shifts, tempShift], now, energyCosts);
  }

  // ── Exhaustion Engine ─────────────────────────────

  static calculateExhaustion(
    shifts: ShiftData[],
    energyCosts: EnergyCosts = DEFAULT_ENERGY_COSTS,
  ): { totalExhaustion: number; breakdown: ShiftExhaustion[] } {
    const sorted = [...shifts].sort((a, b) => a.date.getTime() - b.date.getTime());

    const breakdown: ShiftExhaustion[] = [];
    let totalExhaustion = 0;
    let accumulatedWeeklyHours = 0;
    let consecutiveNights = 0;

    for (let i = 0; i < sorted.length; i++) {
      const shift = sorted[i];
      const baseCost = getBaseCost(shift.type, energyCosts);
      let penalties = 0;

      // Penalty: consecutive shift (< 48h gap from previous)
      if (i > 0) {
        const prevEnd = sorted[i - 1].endDate.getTime();
        const thisStart = shift.date.getTime();
        const gapHours = (thisStart - prevEnd) / 36e5;

        if (gapHours < 48) {
          penalties += PENALTY_CONSECUTIVE_SHIFT;
        }

        // Penalty: 24h shift with < 24h gap
        if (shift.type === 'TWENTY_FOUR_HOURS' && gapHours < 24) {
          penalties += PENALTY_24H_AFTER_SHIFT;
        }
      }

      // Penalty: 3rd+ consecutive night
      if (shift.type === 'NIGHT') {
        consecutiveNights++;
        if (consecutiveNights >= 3) {
          penalties += PENALTY_THIRD_CONSECUTIVE_NIGHT;
        }
      } else {
        consecutiveNights = 0;
      }

      // Penalty: weekly overload (>56h accumulated)
      accumulatedWeeklyHours += shift.hours;
      if (accumulatedWeeklyHours > 56) {
        penalties += PENALTY_WEEKLY_OVERLOAD;
      }

      const totalCost = baseCost + penalties;
      breakdown.push({
        type: shift.type,
        baseCost: Math.round(baseCost * 10) / 10,
        penalties: Math.round(penalties * 10) / 10,
        totalCost: Math.round(totalCost * 10) / 10,
      });

      totalExhaustion += totalCost;
    }

    return {
      totalExhaustion: Math.round(totalExhaustion * 10) / 10,
      breakdown,
    };
  }
}
