import { ShiftData } from '../shifts.engine';
import {
  calculateWorkloadMetrics,
  calculateRecoveryDebt,
  calculateFlowScore,
  generateInsights,
  getEvidence,
  FlowScoreLevel,
  WorkloadMetrics,
  RecoveryDebt,
} from '../flow-score.engine';

function makeShift(
  overrides: Partial<ShiftData> & { date: Date; endDate: Date },
): ShiftData {
  return {
    id: 'shift-1',
    type: 'TWELVE_DAY' as any,
    hours: 12,
    value: 1500,
    location: 'Hospital A',
    status: 'CONFIRMED',
    ...overrides,
  };
}

// Helper: create a date N days ago from reference
function daysAgo(n: number, ref: Date = new Date('2026-03-15T12:00:00')): Date {
  return new Date(ref.getTime() - n * 24 * 3600000);
}

function hoursAgo(n: number, ref: Date = new Date('2026-03-15T12:00:00')): Date {
  return new Date(ref.getTime() - n * 3600000);
}

describe('FlowScore Engine', () => {
  const now = new Date('2026-03-15T12:00:00');

  // ─── calculateWorkloadMetrics ──────────────────────────────────────────────

  describe('calculateWorkloadMetrics', () => {
    it('should return zeros for empty shifts', () => {
      const m = calculateWorkloadMetrics([], now);
      expect(m.hours7d).toBe(0);
      expect(m.hours14d).toBe(0);
      expect(m.hours28d).toBe(0);
      expect(m.avgWeeklyHours28d).toBe(0);
      expect(m.nightShifts7d).toBe(0);
      expect(m.longShifts7d).toBe(0);
      expect(m.consecutiveShifts).toBe(0);
      expect(m.fatigueScore7d).toBe(0);
      expect(m.fatigueScore14d).toBe(0);
      expect(m.fatigueScore28d).toBe(0);
    });

    it('should count hours in the last 7 days only', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(3, now),
          endDate: new Date(daysAgo(3, now).getTime() + 12 * 3600000),
          hours: 12,
        }),
        makeShift({
          id: 's2',
          date: daysAgo(10, now),
          endDate: new Date(daysAgo(10, now).getTime() + 12 * 3600000),
          hours: 12,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.hours7d).toBe(12);
      expect(m.hours14d).toBe(24);
    });

    it('should count night shifts (TWELVE_NIGHT + TWENTY_FOUR_INVERTED)', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(2, now),
          endDate: new Date(daysAgo(2, now).getTime() + 12 * 3600000),
          type: 'TWELVE_NIGHT' as any,
        }),
        makeShift({
          id: 's2',
          date: daysAgo(3, now),
          endDate: new Date(daysAgo(3, now).getTime() + 24 * 3600000),
          type: 'TWENTY_FOUR_INVERTED' as any,
          hours: 24,
        }),
        makeShift({
          id: 's3',
          date: daysAgo(1, now),
          endDate: new Date(daysAgo(1, now).getTime() + 12 * 3600000),
          type: 'TWELVE_DAY' as any,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.nightShifts7d).toBe(2);
    });

    it('should count long shifts (TWENTY_FOUR + TWENTY_FOUR_INVERTED)', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(2, now),
          endDate: new Date(daysAgo(2, now).getTime() + 24 * 3600000),
          type: 'TWENTY_FOUR' as any,
          hours: 24,
        }),
        makeShift({
          id: 's2',
          date: daysAgo(4, now),
          endDate: new Date(daysAgo(4, now).getTime() + 24 * 3600000),
          type: 'TWENTY_FOUR_INVERTED' as any,
          hours: 24,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.longShifts7d).toBe(2);
    });

    it('should calculate fatigue scores using weights', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(2, now),
          endDate: new Date(daysAgo(2, now).getTime() + 12 * 3600000),
          type: 'TWELVE_DAY' as any,
          hours: 12,
        }),
        makeShift({
          id: 's2',
          date: daysAgo(3, now),
          endDate: new Date(daysAgo(3, now).getTime() + 12 * 3600000),
          type: 'TWELVE_NIGHT' as any,
          hours: 12,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      // 1.0 + 1.4 = 2.4
      expect(m.fatigueScore7d).toBeCloseTo(2.4, 1);
    });

    it('should calculate consecutive shifts with <48h gaps', () => {
      // 3 shifts back-to-back
      const shifts = [
        makeShift({
          id: 's1',
          date: hoursAgo(60, now),
          endDate: hoursAgo(48, now),
          hours: 12,
        }),
        makeShift({
          id: 's2',
          date: hoursAgo(36, now),
          endDate: hoursAgo(24, now),
          hours: 12,
        }),
        makeShift({
          id: 's3',
          date: hoursAgo(12, now),
          endDate: hoursAgo(0, now),
          hours: 12,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.consecutiveShifts).toBe(3);
    });

    it('should break consecutive streak on >48h gap', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(5, now),
          endDate: new Date(daysAgo(5, now).getTime() + 12 * 3600000),
          hours: 12,
        }),
        // Gap of >48h
        makeShift({
          id: 's2',
          date: hoursAgo(12, now),
          endDate: hoursAgo(0, now),
          hours: 12,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.consecutiveShifts).toBe(1);
    });

    it('should ignore non-CONFIRMED and realized=false shifts', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(2, now),
          endDate: new Date(daysAgo(2, now).getTime() + 12 * 3600000),
          status: 'SIMULATED',
        }),
        makeShift({
          id: 's2',
          date: daysAgo(3, now),
          endDate: new Date(daysAgo(3, now).getTime() + 12 * 3600000),
          realized: false,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.hours7d).toBe(0);
    });

    it('should calculate avgWeeklyHours28d', () => {
      // 4 shifts of 12h each over 28 days = 48h / 4 = 12
      const shifts = [
        makeShift({ id: 's1', date: daysAgo(5, now), endDate: new Date(daysAgo(5, now).getTime() + 12 * 3600000), hours: 12 }),
        makeShift({ id: 's2', date: daysAgo(10, now), endDate: new Date(daysAgo(10, now).getTime() + 12 * 3600000), hours: 12 }),
        makeShift({ id: 's3', date: daysAgo(15, now), endDate: new Date(daysAgo(15, now).getTime() + 12 * 3600000), hours: 12 }),
        makeShift({ id: 's4', date: daysAgo(20, now), endDate: new Date(daysAgo(20, now).getTime() + 12 * 3600000), hours: 12 }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.avgWeeklyHours28d).toBe(12);
    });

    it('should exclude shifts outside 28d window', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: daysAgo(30, now),
          endDate: new Date(daysAgo(30, now).getTime() + 12 * 3600000),
          hours: 12,
        }),
      ];
      const m = calculateWorkloadMetrics(shifts, now);
      expect(m.hours28d).toBe(0);
    });
  });

  // ─── calculateRecoveryDebt ──────────────────────────────────────────────────

  describe('calculateRecoveryDebt', () => {
    it('should return null hoursSinceLastShift for empty shifts', () => {
      const r = calculateRecoveryDebt([], now);
      expect(r.hoursSinceLastShift).toBeNull();
      expect(r.recoveryDebtHours).toBe(0);
      expect(r.restQuality).toBe('GOOD');
      expect(r.isRecovered).toBe(true);
    });

    it('should calculate recovery after TWELVE_DAY (11h required)', () => {
      const shifts = [
        makeShift({
          date: hoursAgo(20, now),
          endDate: hoursAgo(8, now),
          type: 'TWELVE_DAY' as any,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      expect(r.hoursSinceLastShift).toBeCloseTo(8, 0);
      // Required 11h, got 8h => debt = 3h
      expect(r.recoveryDebtHours).toBeCloseTo(3, 0);
      expect(r.restQuality).toBe('PARTIAL');
      expect(r.isRecovered).toBe(false);
    });

    it('should show GOOD recovery when fully rested after TWELVE_DAY', () => {
      const shifts = [
        makeShift({
          date: hoursAgo(24, now),
          endDate: hoursAgo(12, now),
          type: 'TWELVE_DAY' as any,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      expect(r.hoursSinceLastShift).toBeCloseTo(12, 0);
      expect(r.recoveryDebtHours).toBe(0);
      expect(r.restQuality).toBe('GOOD');
      expect(r.isRecovered).toBe(true);
    });

    it('should require 24h recovery after TWELVE_NIGHT', () => {
      const shifts = [
        makeShift({
          date: hoursAgo(22, now),
          endDate: hoursAgo(10, now),
          type: 'TWELVE_NIGHT' as any,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      // Required 24h, got 10h => debt = 14h
      expect(r.recoveryDebtHours).toBeCloseTo(14, 0);
      expect(r.restQuality).toBe('POOR');
    });

    it('should require 48h recovery after TWENTY_FOUR', () => {
      const shifts = [
        makeShift({
          date: hoursAgo(30, now),
          endDate: hoursAgo(6, now),
          type: 'TWENTY_FOUR' as any,
          hours: 24,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      // Required 48h, got 6h => debt = 42h
      expect(r.recoveryDebtHours).toBeCloseTo(42, 0);
      expect(r.restQuality).toBe('POOR');
    });

    it('should require 48h recovery after TWENTY_FOUR_INVERTED', () => {
      const shifts = [
        makeShift({
          date: hoursAgo(30, now),
          endDate: hoursAgo(6, now),
          type: 'TWENTY_FOUR_INVERTED' as any,
          hours: 24,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      expect(r.recoveryDebtHours).toBeCloseTo(42, 0);
      expect(r.restQuality).toBe('POOR');
    });

    it('should pick most recent shift by endDate', () => {
      const shifts = [
        makeShift({
          id: 's1',
          date: hoursAgo(100, now),
          endDate: hoursAgo(88, now),
          type: 'TWELVE_DAY' as any,
        }),
        makeShift({
          id: 's2',
          date: hoursAgo(20, now),
          endDate: hoursAgo(8, now),
          type: 'TWELVE_DAY' as any,
        }),
      ];
      const r = calculateRecoveryDebt(shifts, now);
      expect(r.hoursSinceLastShift).toBeCloseTo(8, 0);
    });
  });

  // ─── calculateFlowScore ────────────────────────────────────────────────────

  describe('calculateFlowScore', () => {
    const baseWorkload: WorkloadMetrics = {
      hours7d: 36,
      hours14d: 72,
      hours28d: 144,
      avgWeeklyHours28d: 36,
      nightShifts7d: 0,
      longShifts7d: 0,
      consecutiveShifts: 1,
      fatigueScore7d: 2.0,
      fatigueScore14d: 4.0,
      fatigueScore28d: 8.0,
    };

    const baseRecovery: RecoveryDebt = {
      hoursSinceLastShift: 24,
      restQuality: 'GOOD',
      recoveryDebtHours: 0,
      isRecovered: true,
    };

    it('should return PILAR_SUSTENTAVEL for low workload', () => {
      expect(calculateFlowScore(baseWorkload, baseRecovery)).toBe('PILAR_SUSTENTAVEL');
    });

    it('should escalate to PILAR_CARGA_ELEVADA for hours7d 49-60', () => {
      const w = { ...baseWorkload, hours7d: 55 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_CARGA_ELEVADA');
    });

    it('should escalate to PILAR_RISCO_FADIGA for hours7d 61-72', () => {
      const w = { ...baseWorkload, hours7d: 65 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_RISCO_FADIGA');
    });

    it('should escalate to PILAR_ALTO_RISCO for hours7d >72', () => {
      const w = { ...baseWorkload, hours7d: 80 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_ALTO_RISCO');
    });

    it('should escalate based on nightShifts7d', () => {
      const w = { ...baseWorkload, nightShifts7d: 4 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_ALTO_RISCO');
    });

    it('should escalate based on consecutive shifts', () => {
      const w = { ...baseWorkload, consecutiveShifts: 6 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_ALTO_RISCO');
    });

    it('should use worst-of logic: low hours but high night shifts', () => {
      const w = { ...baseWorkload, hours7d: 24, nightShifts7d: 3 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_RISCO_FADIGA');
    });

    it('should escalate based on recovery debt >12h', () => {
      const r: RecoveryDebt = {
        hoursSinceLastShift: 5,
        restQuality: 'POOR',
        recoveryDebtHours: 15,
        isRecovered: false,
      };
      expect(calculateFlowScore(baseWorkload, r)).toBe('PILAR_ALTO_RISCO');
    });

    it('should escalate to PILAR_CARGA_ELEVADA for recovery debt 1-6h', () => {
      const r: RecoveryDebt = {
        hoursSinceLastShift: 8,
        restQuality: 'PARTIAL',
        recoveryDebtHours: 4,
        isRecovered: false,
      };
      expect(calculateFlowScore(baseWorkload, r)).toBe('PILAR_CARGA_ELEVADA');
    });

    it('should escalate based on fatigue7d score', () => {
      const w = { ...baseWorkload, fatigueScore7d: 10.0 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_ALTO_RISCO');
    });

    it('should escalate based on hours14d', () => {
      const w = { ...baseWorkload, hours14d: 150 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_ALTO_RISCO');
    });

    it('should escalate based on avgWeekly28d', () => {
      const w = { ...baseWorkload, avgWeeklyHours28d: 60 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_RISCO_FADIGA');
    });

    it('should escalate based on longShifts7d', () => {
      const w = { ...baseWorkload, longShifts7d: 3 };
      expect(calculateFlowScore(w, baseRecovery)).toBe('PILAR_RISCO_FADIGA');
    });
  });

  // ─── generateInsights ──────────────────────────────────────────────────────

  describe('generateInsights', () => {
    const baseWorkload: WorkloadMetrics = {
      hours7d: 36,
      hours14d: 72,
      hours28d: 144,
      avgWeeklyHours28d: 36,
      nightShifts7d: 0,
      longShifts7d: 0,
      consecutiveShifts: 1,
      fatigueScore7d: 2.0,
      fatigueScore14d: 4.0,
      fatigueScore28d: 8.0,
    };

    const baseRecovery: RecoveryDebt = {
      hoursSinceLastShift: 24,
      restQuality: 'GOOD',
      recoveryDebtHours: 0,
      isRecovered: true,
    };

    it('should return sustainable message for PILAR_SUSTENTAVEL', () => {
      const insights = generateInsights(baseWorkload, baseRecovery, 'PILAR_SUSTENTAVEL');
      expect(insights).toHaveLength(1);
      expect(insights[0]).toContain('sustentáveis');
    });

    it('should generate high hours insight', () => {
      const w = { ...baseWorkload, hours7d: 65 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_RISCO_FADIGA');
      expect(insights.some((i) => i.includes('65h'))).toBe(true);
    });

    it('should generate night shift insight', () => {
      const w = { ...baseWorkload, nightShifts7d: 3 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_RISCO_FADIGA');
      expect(insights.some((i) => i.includes('noturnos'))).toBe(true);
    });

    it('should generate consecutive shifts insight', () => {
      const w = { ...baseWorkload, consecutiveShifts: 4 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_RISCO_FADIGA');
      expect(insights.some((i) => i.includes('consecutivos'))).toBe(true);
    });

    it('should generate recovery debt insight', () => {
      const r: RecoveryDebt = { ...baseRecovery, recoveryDebtHours: 5, isRecovered: false };
      const insights = generateInsights(baseWorkload, r, 'PILAR_CARGA_ELEVADA');
      expect(insights.some((i) => i.includes('recuperação'))).toBe(true);
    });

    it('should generate burnout warning for chronic overwork', () => {
      const w = { ...baseWorkload, avgWeeklyHours28d: 60 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_RISCO_FADIGA');
      expect(insights.some((i) => i.includes('burnout'))).toBe(true);
    });

    it('should add ALTO_RISCO warning', () => {
      const w = { ...baseWorkload, hours7d: 80 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_ALTO_RISCO');
      expect(insights.some((i) => i.includes('inegociável'))).toBe(true);
    });

    it('should generate long shifts insight', () => {
      const w = { ...baseWorkload, longShifts7d: 3 };
      const insights = generateInsights(w, baseRecovery, 'PILAR_RISCO_FADIGA');
      expect(insights.some((i) => i.includes('24h'))).toBe(true);
    });
  });

  // ─── getEvidence ───────────────────────────────────────────────────────────

  describe('getEvidence', () => {
    const baseWorkload: WorkloadMetrics = {
      hours7d: 36,
      hours14d: 72,
      hours28d: 144,
      avgWeeklyHours28d: 36,
      nightShifts7d: 0,
      longShifts7d: 0,
      consecutiveShifts: 1,
      fatigueScore7d: 2.0,
      fatigueScore14d: 4.0,
      fatigueScore28d: 8.0,
    };

    const baseRecovery: RecoveryDebt = {
      hoursSinceLastShift: 24,
      restQuality: 'GOOD',
      recoveryDebtHours: 0,
      isRecovered: true,
    };

    it('should return empty for low workload', () => {
      const e = getEvidence(baseWorkload, baseRecovery);
      expect(e).toHaveLength(0);
    });

    it('should cite hours evidence when hours7d >48', () => {
      const w = { ...baseWorkload, hours7d: 55 };
      const e = getEvidence(w, baseRecovery);
      expect(e.some((c) => c.factor === 'hours')).toBe(true);
      expect(e.some((c) => c.citation.includes('ACGME'))).toBe(true);
    });

    it('should cite night shift evidence when nightShifts7d >=2', () => {
      const w = { ...baseWorkload, nightShifts7d: 2 };
      const e = getEvidence(w, baseRecovery);
      expect(e.some((c) => c.factor === 'nightShifts')).toBe(true);
    });

    it('should cite consecutive evidence when consecutiveShifts >=3', () => {
      const w = { ...baseWorkload, consecutiveShifts: 3 };
      const e = getEvidence(w, baseRecovery);
      expect(e.some((c) => c.factor === 'consecutive')).toBe(true);
    });

    it('should cite long shifts evidence when longShifts7d >=1', () => {
      const w = { ...baseWorkload, longShifts7d: 1 };
      const e = getEvidence(w, baseRecovery);
      expect(e.some((c) => c.factor === 'longShifts')).toBe(true);
    });

    it('should return multiple citations for combined risk', () => {
      const w = { ...baseWorkload, hours7d: 60, nightShifts7d: 3, longShifts7d: 2 };
      const e = getEvidence(w, baseRecovery);
      expect(e.length).toBeGreaterThanOrEqual(3);
    });
  });
});
