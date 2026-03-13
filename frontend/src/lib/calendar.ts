import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Shift } from '@/types';

export { addMonths, subMonths, isSameMonth, isSameDay, isToday, format };
export { ptBR };

/**
 * Returns all days needed for a monthly calendar grid (35-42 days).
 * Week starts on Monday.
 */
export function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

/**
 * Returns ISO date range covering the full calendar grid for API queries.
 */
export function getMonthRange(month: Date): { from: string; to: string } {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Groups shifts by day key 'YYYY-MM-DD'.
 * Handles multi-day shifts by adding them to each day they span.
 */
export function groupShiftsByDay(shifts: Shift[]): Map<string, Shift[]> {
  const map = new Map<string, Shift[]>();

  for (const shift of shifts) {
    const start = new Date(shift.date);
    const end = new Date(shift.endDate);

    // Add shift to each day it spans
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const key = format(current, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(shift);
      map.set(key, existing);
      current.setDate(current.getDate() + 1);
    }
  }

  return map;
}

/**
 * Quick client-side conflict detection for visual badges on calendar days.
 */
export function detectDayConflicts(dayShifts: Shift[]): {
  hasOverlap: boolean;
  hasRestWarning: boolean;
} {
  if (dayShifts.length < 2) {
    return { hasOverlap: false, hasRestWarning: false };
  }

  // Sort by start time
  const sorted = [...dayShifts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let hasOverlap = false;
  let hasRestWarning = false;
  const MIN_REST_MS = 11 * 60 * 60 * 1000; // 11 hours in ms

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(sorted[i].endDate).getTime();
    const nextStart = new Date(sorted[i + 1].date).getTime();

    // Check overlap: current ends after next starts
    if (currentEnd > nextStart) {
      hasOverlap = true;
    }

    // Check rest gap
    const gap = nextStart - currentEnd;
    if (gap >= 0 && gap < MIN_REST_MS) {
      hasRestWarning = true;
    }
  }

  return { hasOverlap, hasRestWarning };
}

/**
 * Format a month label like "Março 2026" using the given locale.
 */
export function formatMonthLabel(month: Date, locale?: Locale): string {
  const loc = locale || ptBR;
  const label = format(month, 'MMMM yyyy', { locale: loc });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
