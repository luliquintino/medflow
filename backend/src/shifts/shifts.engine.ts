/**
 * Workload Engine
 * Pure business logic for shift workload calculations.
 */

import { ShiftType } from '@prisma/client';

export interface ShiftData {
  id: string;
  date: Date;
  endDate: Date;
  type: ShiftType;
  hours: number;
  value: number;
  location: string;
  status: string;
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
}

export interface HypotheticalShift {
  date: Date;
  type: ShiftType;
  hours: number;
  value: number;
}

export class WorkloadEngine {
  static calculate(
    shifts: ShiftData[],
    now: Date = new Date(),
  ): WorkloadSummary {
    const confirmed = shifts.filter((s) => s.status === 'CONFIRMED');
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

    const weekShifts = confirmed.filter(
      (s) => s.date >= weekStart && s.date <= weekEnd,
    );
    const monthShifts = confirmed.filter(
      (s) => s.date >= monthStart && s.date <= monthEnd,
    );
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

        const gapHours =
          (lastEnd.getTime() - shift.endDate.getTime()) / 36e5;
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
      confirmed.length > 0
        ? confirmed.reduce((s, sh) => s + sh.hours, 0) / confirmed.length
        : 0;

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
    };
  }

  /** Add a hypothetical shift and recalculate */
  static calculateWithHypothetical(
    shifts: ShiftData[],
    hypothetical: HypotheticalShift,
    now: Date = new Date(),
  ): WorkloadSummary {
    const tempShift: ShiftData = {
      id: 'hypothetical',
      date: hypothetical.date,
      endDate: new Date(
        hypothetical.date.getTime() + hypothetical.hours * 36e5,
      ),
      type: hypothetical.type,
      hours: hypothetical.hours,
      value: hypothetical.value,
      location: '',
      status: 'CONFIRMED',
    };
    return this.calculate([...shifts, tempShift], now);
  }
}
