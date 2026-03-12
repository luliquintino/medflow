import { WorkloadEngine, DEFAULT_ENERGY_COSTS, ShiftData } from '../shifts.engine';

describe('WorkloadEngine', () => {
  const now = new Date('2026-03-15T12:00:00');

  function makeShift(overrides: Partial<ShiftData> & { date: Date }): ShiftData {
    return {
      id: 'shift-1',
      endDate: new Date(overrides.date.getTime() + 12 * 3600000),
      type: 'TWELVE_DAY' as any,
      hours: 12,
      value: 1500,
      location: 'Hospital A',
      status: 'CONFIRMED',
      ...overrides,
    };
  }

  describe('calculate', () => {
    it('should return zeros for empty shifts', () => {
      const result = WorkloadEngine.calculate([], now);
      expect(result.totalHoursThisWeek).toBe(0);
      expect(result.totalHoursThisMonth).toBe(0);
      expect(result.shiftsThisMonth).toBe(0);
      expect(result.totalExhaustionScore).toBe(0);
    });

    it('should count hours for current week shifts', () => {
      // Create shifts in the same week as March 15 2026 (Sunday March 15)
      const shift = makeShift({ date: new Date('2026-03-15T07:00:00') });
      const result = WorkloadEngine.calculate([shift], now);
      expect(result.totalHoursThisWeek).toBe(12);
      expect(result.shiftsThisWeek).toBe(1);
    });

    it('should count monthly revenue', () => {
      const shifts = [
        makeShift({ date: new Date('2026-03-02T07:00:00'), value: 1500 }),
        makeShift({ date: new Date('2026-03-10T07:00:00'), value: 2000 }),
      ];
      const result = WorkloadEngine.calculate(shifts, now);
      expect(result.revenueThisMonth).toBe(3500);
      expect(result.shiftsThisMonth).toBe(2);
    });

    it('should ignore non-CONFIRMED shifts', () => {
      const shift = makeShift({
        date: new Date('2026-03-10T07:00:00'),
        status: 'SIMULATED',
      });
      const result = WorkloadEngine.calculate([shift], now);
      expect(result.shiftsThisMonth).toBe(0);
    });

    it('should detect consecutive shifts (< 48h gap)', () => {
      const shift1 = makeShift({
        id: 's1',
        date: new Date('2026-03-13T07:00:00'),
      });
      const shift2 = makeShift({
        id: 's2',
        date: new Date('2026-03-14T07:00:00'),
      });
      const result = WorkloadEngine.calculate([shift1, shift2], now);
      expect(result.consecutiveShifts).toBeGreaterThanOrEqual(2);
      expect(result.nextRestDayRecommended).toBe(true);
    });

    it('should recommend rest day after 2+ consecutive shifts', () => {
      const shift1 = makeShift({
        id: 's1',
        date: new Date('2026-03-12T07:00:00'),
        endDate: new Date('2026-03-12T19:00:00'),
      });
      const shift2 = makeShift({
        id: 's2',
        date: new Date('2026-03-13T07:00:00'),
        endDate: new Date('2026-03-13T19:00:00'),
      });
      const shift3 = makeShift({
        id: 's3',
        date: new Date('2026-03-14T07:00:00'),
        endDate: new Date('2026-03-14T19:00:00'),
      });
      const result = WorkloadEngine.calculate([shift1, shift2, shift3], now);
      expect(result.consecutiveShifts).toBeGreaterThanOrEqual(3);
      expect(result.nextRestDayRecommended).toBe(true);
    });
  });

  describe('calculateExhaustion', () => {
    it('should calculate base cost for diurno shifts', () => {
      const shift = makeShift({
        date: new Date('2026-03-10T07:00:00'),
        type: 'TWELVE_DAY' as any,
      });
      const result = WorkloadEngine.calculateExhaustion([shift]);
      expect(result.totalExhaustion).toBe(1.0);
      expect(result.breakdown[0].baseCost).toBe(1.0);
    });

    it('should calculate higher cost for night shifts', () => {
      const shift = makeShift({
        date: new Date('2026-03-10T19:00:00'),
        type: 'TWELVE_NIGHT' as any,
      });
      const result = WorkloadEngine.calculateExhaustion([shift]);
      expect(result.totalExhaustion).toBe(1.5);
    });

    it('should calculate highest cost for 24h shifts', () => {
      const shift = makeShift({
        date: new Date('2026-03-10T07:00:00'),
        type: 'TWENTY_FOUR' as any,
        hours: 24,
      });
      const result = WorkloadEngine.calculateExhaustion([shift]);
      expect(result.totalExhaustion).toBe(2.5);
    });

    it('should add penalty for consecutive shifts (< 48h gap)', () => {
      const shift1 = makeShift({
        id: 's1',
        date: new Date('2026-03-10T07:00:00'),
        endDate: new Date('2026-03-10T19:00:00'),
      });
      const shift2 = makeShift({
        id: 's2',
        date: new Date('2026-03-11T07:00:00'),
      }); // 12h gap
      const result = WorkloadEngine.calculateExhaustion([shift1, shift2]);
      // shift1: 1.0, shift2: 1.0 + 0.5 (consecutive penalty) = 1.5
      expect(result.totalExhaustion).toBe(2.5);
    });

    it('should add penalty for 3rd+ consecutive night shifts', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: new Date('2026-03-10T19:00:00'),
          endDate: new Date('2026-03-11T07:00:00'),
          type: 'TWELVE_NIGHT' as any,
        }),
        makeShift({
          id: 's2',
          date: new Date('2026-03-11T19:00:00'),
          endDate: new Date('2026-03-12T07:00:00'),
          type: 'TWELVE_NIGHT' as any,
        }),
        makeShift({
          id: 's3',
          date: new Date('2026-03-12T19:00:00'),
          endDate: new Date('2026-03-13T07:00:00'),
          type: 'TWELVE_NIGHT' as any,
        }),
      ];
      const result = WorkloadEngine.calculateExhaustion(shifts);
      // 3rd night gets PENALTY_THIRD_CONSECUTIVE_NIGHT = 0.7
      const thirdShiftCost = result.breakdown[2].totalCost;
      expect(thirdShiftCost).toBeGreaterThan(1.5); // base 1.5 + penalties
    });

    it('should return empty breakdown for empty shifts', () => {
      const result = WorkloadEngine.calculateExhaustion([]);
      expect(result.totalExhaustion).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  describe('calculateWithHypothetical', () => {
    it('should include hypothetical shift in calculation', () => {
      const existing = makeShift({
        date: new Date('2026-03-10T07:00:00'),
        value: 1500,
      });
      const hypothetical = {
        date: new Date('2026-03-12T07:00:00'),
        type: 'TWELVE_DAY' as any,
        hours: 12,
        value: 1500,
      };
      const result = WorkloadEngine.calculateWithHypothetical([existing], hypothetical, now);
      expect(result.revenueThisMonth).toBe(3000);
    });
  });
});
