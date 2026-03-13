import { getCalendarDays, getMonthRange, groupShiftsByDay, detectDayConflicts, formatMonthLabel } from '../calendar';
import type { Shift } from '@/types';

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    date: '2026-03-15T08:00:00.000Z',
    endDate: '2026-03-15T20:00:00.000Z',
    type: 'TWELVE_DAY',
    hours: 12,
    value: 1500,
    location: 'Hospital A',
    status: 'CONFIRMED',
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getCalendarDays', () => {
  it('should return days starting from Monday', () => {
    const days = getCalendarDays(new Date(2026, 2, 1)); // March 2026
    expect(days[0].getDay()).toBe(1); // Monday
  });

  it('should return 35 or 42 days', () => {
    const days = getCalendarDays(new Date(2026, 2, 1));
    expect([35, 42]).toContain(days.length);
  });

  it('should include all days of the month', () => {
    const month = new Date(2026, 2, 1);
    const days = getCalendarDays(month);
    // March has 31 days
    for (let d = 1; d <= 31; d++) {
      const found = days.some(
        (day) => day.getDate() === d && day.getMonth() === 2
      );
      expect(found).toBe(true);
    }
  });
});

describe('getMonthRange', () => {
  it('should return ISO strings for the full grid range', () => {
    const { from, to } = getMonthRange(new Date(2026, 2, 1));
    expect(new Date(from)).toBeInstanceOf(Date);
    expect(new Date(to)).toBeInstanceOf(Date);
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
  });

  it('should start before or on the 1st of the month', () => {
    const { from } = getMonthRange(new Date(2026, 2, 1));
    const start = new Date(from);
    const monthStart = new Date(2026, 2, 1);
    // Grid starts on Monday of the week containing the 1st — may be in previous month
    expect(start.getTime()).toBeLessThanOrEqual(monthStart.getTime());
  });
});

describe('groupShiftsByDay', () => {
  it('should group shifts by their date', () => {
    const shifts = [
      makeShift({ id: 's1', date: '2026-03-15T08:00:00.000Z', endDate: '2026-03-15T20:00:00.000Z' }),
      makeShift({ id: 's2', date: '2026-03-15T20:00:00.000Z', endDate: '2026-03-16T08:00:00.000Z' }),
      makeShift({ id: 's3', date: '2026-03-16T08:00:00.000Z', endDate: '2026-03-16T20:00:00.000Z' }),
    ];

    const grouped = groupShiftsByDay(shifts);
    expect(grouped.get('2026-03-15')?.length).toBe(2); // s1 + s2
    expect(grouped.get('2026-03-16')?.length).toBe(2); // s2 (spans) + s3
  });

  it('should handle multi-day shifts (24h)', () => {
    const shifts = [
      makeShift({
        id: 's1',
        date: '2026-03-15T08:00:00.000Z',
        endDate: '2026-03-16T08:00:00.000Z',
        type: 'TWENTY_FOUR',
        hours: 24,
      }),
    ];

    const grouped = groupShiftsByDay(shifts);
    expect(grouped.get('2026-03-15')?.length).toBe(1);
    expect(grouped.get('2026-03-16')?.length).toBe(1);
  });

  it('should return empty map for no shifts', () => {
    const grouped = groupShiftsByDay([]);
    expect(grouped.size).toBe(0);
  });
});

describe('detectDayConflicts', () => {
  it('should return no conflicts for single shift', () => {
    const result = detectDayConflicts([makeShift()]);
    expect(result.hasOverlap).toBe(false);
    expect(result.hasRestWarning).toBe(false);
  });

  it('should detect overlapping shifts', () => {
    const shifts = [
      makeShift({ id: 's1', date: '2026-03-15T06:00:00.000Z', endDate: '2026-03-15T18:00:00.000Z' }),
      makeShift({ id: 's2', date: '2026-03-15T14:00:00.000Z', endDate: '2026-03-16T02:00:00.000Z' }),
    ];
    const result = detectDayConflicts(shifts);
    expect(result.hasOverlap).toBe(true);
  });

  it('should detect rest gap < 11h', () => {
    const shifts = [
      makeShift({ id: 's1', date: '2026-03-15T06:00:00.000Z', endDate: '2026-03-15T18:00:00.000Z' }),
      makeShift({ id: 's2', date: '2026-03-15T22:00:00.000Z', endDate: '2026-03-16T10:00:00.000Z' }),
    ];
    const result = detectDayConflicts(shifts);
    expect(result.hasOverlap).toBe(false);
    expect(result.hasRestWarning).toBe(true); // 4h gap
  });

  it('should not warn when rest gap >= 11h', () => {
    const shifts = [
      makeShift({ id: 's1', date: '2026-03-15T06:00:00.000Z', endDate: '2026-03-15T18:00:00.000Z' }),
      makeShift({ id: 's2', date: '2026-03-16T06:00:00.000Z', endDate: '2026-03-16T18:00:00.000Z' }),
    ];
    const result = detectDayConflicts(shifts);
    expect(result.hasOverlap).toBe(false);
    expect(result.hasRestWarning).toBe(false); // 12h gap
  });

  it('should return no conflicts for empty array', () => {
    const result = detectDayConflicts([]);
    expect(result.hasOverlap).toBe(false);
    expect(result.hasRestWarning).toBe(false);
  });
});

describe('formatMonthLabel', () => {
  it('should capitalize the first letter', () => {
    const label = formatMonthLabel(new Date(2026, 2, 1));
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
  });

  it('should include year', () => {
    const label = formatMonthLabel(new Date(2026, 2, 1));
    expect(label).toContain('2026');
  });
});
