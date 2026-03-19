import {
  HospitalRoiEngine,
  HospitalRoiInput,
  RoiShift,
  RoiHospital,
  HospitalRoi,
} from '../hospital-roi.engine';

const NOW = new Date('2026-03-15T12:00:00Z');

function makeShift(overrides: Partial<RoiShift> = {}): RoiShift {
  return {
    date: '2026-03-10',
    value: 1500,
    hours: 12,
    type: 'TWELVE_DAY',
    hospitalId: 'h1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<HospitalRoiInput> = {}): HospitalRoiInput {
  return {
    shifts: [],
    hospitals: [
      { id: 'h1', name: 'Hospital A' },
      { id: 'h2', name: 'Hospital B' },
      { id: 'h3', name: 'Hospital C' },
    ],
    now: NOW,
    ...overrides,
  };
}

describe('HospitalRoiEngine', () => {
  describe('zero shifts / empty input', () => {
    it('should return empty hospitals array when no shifts', () => {
      const result = HospitalRoiEngine.calculate(makeInput());
      expect(result.hospitals).toHaveLength(0);
    });

    it('should return empty when hospitals array is empty', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [makeShift()],
          hospitals: [],
        }),
      );
      expect(result.hospitals).toHaveLength(0);
    });
  });

  describe('revenuePerHour calculation', () => {
    it('should calculate revenuePerHour correctly per hospital', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [
            makeShift({ hospitalId: 'h1', value: 2400, hours: 24 }), // 100/h
            makeShift({ hospitalId: 'h1', value: 1200, hours: 12 }), // 100/h
            makeShift({ hospitalId: 'h2', value: 1800, hours: 12 }), // 150/h
          ],
        }),
      );

      const h1 = result.hospitals.find((h) => h.hospitalId === 'h1')!;
      const h2 = result.hospitals.find((h) => h.hospitalId === 'h2')!;

      expect(h1.revenuePerHour).toBe(100); // 3600 / 36
      expect(h2.revenuePerHour).toBe(150); // 1800 / 12
      expect(h1.totalRevenue).toBe(3600);
      expect(h1.totalHours).toBe(36);
      expect(h1.shiftCount).toBe(2);
      expect(h1.avgShiftValue).toBe(1800); // 3600 / 2
    });
  });

  describe('reliabilityScore', () => {
    it('should give high reliability for consistent payments and frequent recent shifts', () => {
      // All same value, frequent, very recent → high reliability
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 1500, date: '2026-03-01' }),
        makeShift({ hospitalId: 'h1', value: 1500, date: '2026-03-05' }),
        makeShift({ hospitalId: 'h1', value: 1500, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h1', value: 1500, date: '2026-03-14' }),
      ];
      const result = HospitalRoiEngine.calculate(
        makeInput({ shifts, hospitals: [{ id: 'h1', name: 'A' }] }),
      );

      const h1 = result.hospitals[0];
      expect(h1.reliabilityScore).toBeGreaterThan(70);
    });

    it('should give lower reliability for inconsistent payments', () => {
      // Wildly varying values → lower consistency score
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 500, date: '2026-03-01' }),
        makeShift({ hospitalId: 'h1', value: 3000, date: '2026-03-05' }),
        makeShift({ hospitalId: 'h1', value: 100, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h1', value: 2500, date: '2026-03-14' }),
      ];
      const result = HospitalRoiEngine.calculate(
        makeInput({ shifts, hospitals: [{ id: 'h1', name: 'A' }] }),
      );

      const h1 = result.hospitals[0];
      // Consistency sub-score should pull reliability down
      expect(h1.reliabilityScore).toBeLessThan(90);
    });

    it('should penalize old/stale shifts via recency', () => {
      // Shifts from 5 months ago, none recent
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 1500, date: '2025-10-01' }),
        makeShift({ hospitalId: 'h1', value: 1500, date: '2025-10-15' }),
      ];
      const result = HospitalRoiEngine.calculate(
        makeInput({ shifts, hospitals: [{ id: 'h1', name: 'A' }] }),
      );

      const h1 = result.hospitals[0];
      // Recency should be very low (>180 days ago)
      expect(h1.reliabilityScore).toBeLessThan(60);
    });
  });

  describe('composite hospitalScore', () => {
    it('should compute 50% value/hour + 25% volume + 25% reliability', () => {
      // Two hospitals: h1 has better value/hour, h2 has more volume
      const shifts: RoiShift[] = [
        // h1: 1 shift, 200/h
        makeShift({ hospitalId: 'h1', value: 2400, hours: 12, date: '2026-03-10' }),
        // h2: 3 shifts, 100/h each
        makeShift({ hospitalId: 'h2', value: 1200, hours: 12, date: '2026-03-08' }),
        makeShift({ hospitalId: 'h2', value: 1200, hours: 12, date: '2026-03-09' }),
        makeShift({ hospitalId: 'h2', value: 1200, hours: 12, date: '2026-03-10' }),
      ];

      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts,
          hospitals: [
            { id: 'h1', name: 'A' },
            { id: 'h2', name: 'B' },
          ],
        }),
      );

      const h1 = result.hospitals.find((h) => h.hospitalId === 'h1')!;
      const h2 = result.hospitals.find((h) => h.hospitalId === 'h2')!;

      // h1 should have higher score because value/hour is weighted 50%
      // h1: normVph=100, normVol=0, normRel varies
      // h2: normVph=0, normVol=100, normRel varies
      // Both reliability should be similar (all recent, h2 slightly more consistent)
      // h1 score = 100*0.5 + 0*0.25 + rel*0.25
      // h2 score = 0*0.5 + 100*0.25 + rel*0.25
      // So h1 should be higher (50 + ...) vs h2 (25 + ...)
      expect(h1.hospitalScore).toBeGreaterThan(h2.hospitalScore);

      // Both scores should be between 0 and 100
      expect(h1.hospitalScore).toBeGreaterThanOrEqual(0);
      expect(h1.hospitalScore).toBeLessThanOrEqual(100);
      expect(h2.hospitalScore).toBeGreaterThanOrEqual(0);
      expect(h2.hospitalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('tier assignment', () => {
    it('should assign tiers: top 33% ouro, middle prata, bottom bronze', () => {
      const shifts: RoiShift[] = [
        // h1: best value/hour (200/h)
        makeShift({ hospitalId: 'h1', value: 2400, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h1', value: 2400, hours: 12, date: '2026-03-12' }),
        // h2: middle (150/h)
        makeShift({ hospitalId: 'h2', value: 1800, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h2', value: 1800, hours: 12, date: '2026-03-12' }),
        // h3: worst (100/h)
        makeShift({ hospitalId: 'h3', value: 1200, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h3', value: 1200, hours: 12, date: '2026-03-12' }),
      ];

      const result = HospitalRoiEngine.calculate(makeInput({ shifts }));

      // Sorted by score descending
      expect(result.hospitals[0].hospitalTier).toBe('ouro');
      expect(result.hospitals[1].hospitalTier).toBe('prata');
      expect(result.hospitals[2].hospitalTier).toBe('bronze');
    });

    it('should assign ouro to single hospital', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [makeShift({ hospitalId: 'h1' })],
          hospitals: [{ id: 'h1', name: 'Solo Hospital' }],
        }),
      );

      expect(result.hospitals).toHaveLength(1);
      expect(result.hospitals[0].hospitalTier).toBe('ouro');
    });
  });

  describe('insights', () => {
    it('should generate a PT-BR insight for each hospital', () => {
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 2400, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h2', value: 1200, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h3', value: 600, hours: 12, date: '2026-03-10' }),
      ];
      const result = HospitalRoiEngine.calculate(makeInput({ shifts }));

      for (const h of result.hospitals) {
        expect(typeof h.insight).toBe('string');
        expect(h.insight.length).toBeGreaterThan(5);
      }
    });

    it('should give "unico hospital" insight for single hospital', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [makeShift({ hospitalId: 'h1' })],
          hospitals: [{ id: 'h1', name: 'Solo Hospital' }],
        }),
      );
      expect(result.hospitals[0].insight).toContain('unico hospital');
    });

    it('should give "mais rentavel" insight to best revenue/hour ouro hospital', () => {
      const shifts: RoiShift[] = [
        // h1: best
        makeShift({ hospitalId: 'h1', value: 3000, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h1', value: 3000, hours: 12, date: '2026-03-12' }),
        // h2: middle
        makeShift({ hospitalId: 'h2', value: 1500, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h2', value: 1500, hours: 12, date: '2026-03-12' }),
        // h3: worst
        makeShift({ hospitalId: 'h3', value: 500, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h3', value: 500, hours: 12, date: '2026-03-12' }),
      ];

      const result = HospitalRoiEngine.calculate(makeInput({ shifts }));

      const ouro = result.hospitals.find((h) => h.hospitalTier === 'ouro')!;
      expect(ouro.insight).toContain('mais rentavel');
    });
  });

  describe('edge cases', () => {
    it('should handle all hospitals with identical values', () => {
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 1500, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h2', value: 1500, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h3', value: 1500, hours: 12, date: '2026-03-10' }),
      ];

      const result = HospitalRoiEngine.calculate(makeInput({ shifts }));

      // When all identical, normalize returns 100 for each sub-score
      // All should get score 100 and tier ouro
      for (const h of result.hospitals) {
        expect(h.hospitalScore).toBe(100);
        expect(h.hospitalTier).toBe('ouro');
      }
    });

    it('should ignore shifts for unknown hospitals (not in hospitals array)', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [makeShift({ hospitalId: 'unknown' })],
          hospitals: [{ id: 'h1', name: 'A' }],
        }),
      );

      expect(result.hospitals).toHaveLength(0);
    });

    it('should return results sorted by score descending', () => {
      const shifts: RoiShift[] = [
        makeShift({ hospitalId: 'h1', value: 500, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h2', value: 2000, hours: 12, date: '2026-03-10' }),
        makeShift({ hospitalId: 'h3', value: 1200, hours: 12, date: '2026-03-10' }),
      ];
      const result = HospitalRoiEngine.calculate(makeInput({ shifts }));

      for (let i = 1; i < result.hospitals.length; i++) {
        expect(result.hospitals[i - 1].hospitalScore).toBeGreaterThanOrEqual(
          result.hospitals[i].hospitalScore,
        );
      }
    });

    it('should handle shifts with zero hours gracefully', () => {
      const result = HospitalRoiEngine.calculate(
        makeInput({
          shifts: [makeShift({ hospitalId: 'h1', value: 1500, hours: 0 })],
          hospitals: [{ id: 'h1', name: 'A' }],
        }),
      );

      const h1 = result.hospitals[0];
      expect(h1.revenuePerHour).toBe(0);
      expect(h1.totalHours).toBe(0);
    });
  });
});
