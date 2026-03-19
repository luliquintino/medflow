import { InsightsEngine, InsightsInput, StrategicInsight } from '../insights.engine';
import { HospitalRoi } from '../hospital-roi.engine';
import { BenchmarkingResult } from '../benchmarking.engine';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeHospitalRoi(overrides: Partial<HospitalRoi> = {}): HospitalRoi {
  return {
    hospitalId: 'h1',
    hospitalName: 'Hospital A',
    totalRevenue: 10000,
    totalHours: 100,
    revenuePerHour: 100,
    avgShiftValue: 1500,
    shiftCount: 7,
    reliabilityScore: 80,
    hospitalScore: 75,
    hospitalTier: 'ouro',
    insight: '',
    ...overrides,
  };
}

function makeBenchmarking(overrides: Partial<BenchmarkingResult> = {}): BenchmarkingResult {
  return {
    snapshots: {
      currentMonth: { revenue: 12000, hours: 120, shiftsCount: 8, revenuePerHour: 100 },
      previousMonth: { revenue: 10000, hours: 100, shiftsCount: 7, revenuePerHour: 100 },
      threeMonthAvg: { revenue: 11000, hours: 110, shiftsCount: 7, revenuePerHour: 100 },
      sixMonthAvg: { revenue: 10000, hours: 100, shiftsCount: 7, revenuePerHour: 100 },
    },
    deltas: {
      vsLastMonth: { revenue: 20, hours: 20, revenuePerHour: 0 },
      vsThreeMonthAvg: { revenue: 9, hours: 9, revenuePerHour: 0 },
    },
    goals: {
      vsMinimumGoal: { gap: 0, progress: 100, onTrack: true },
      vsIdealGoal: { gap: 3000, progress: 80, onTrack: false },
    },
    trends: {
      revenuePerHour: 'stable',
      workload: 'stable',
      goalAttainment: 'stable',
    },
    ...overrides,
  };
}

function makeInput(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    hospitalRoi: [makeHospitalRoi()],
    benchmarking: makeBenchmarking(),
    flowScoreLevel: 'PILAR_SUSTENTAVEL',
    averageShiftValue: 1500,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('InsightsEngine', () => {
  it('should return insights sorted by priority', () => {
    const input = makeInput();
    const result = InsightsEngine.generate(input);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
    }
  });

  // Rule 1: Hospital below personal avg value/hour
  describe('Rule 1: Hospital below avg value/hour', () => {
    it('should generate "opportunity" when hospital is below average', () => {
      const input = makeInput({
        hospitalRoi: [
          makeHospitalRoi({ hospitalId: 'h1', hospitalName: 'Hospital Bom', totalRevenue: 10000, totalHours: 100, revenuePerHour: 100, shiftCount: 5 }),
          makeHospitalRoi({ hospitalId: 'h2', hospitalName: 'Hospital Fraco', totalRevenue: 5000, totalHours: 100, revenuePerHour: 50, shiftCount: 5 }),
        ],
      });

      const result = InsightsEngine.generate(input);
      const opp = result.find((i) => i.type === 'opportunity' && i.title.includes('Hospital Fraco'));
      expect(opp).toBeDefined();
      expect(opp!.description).toContain('abaixo');
    });

    it('should not trigger for hospitals with < 2 shifts', () => {
      const input = makeInput({
        hospitalRoi: [
          makeHospitalRoi({ hospitalId: 'h1', totalRevenue: 10000, totalHours: 100, revenuePerHour: 100, shiftCount: 5 }),
          makeHospitalRoi({ hospitalId: 'h2', hospitalName: 'Rare', totalRevenue: 500, totalHours: 10, revenuePerHour: 50, shiftCount: 1 }),
        ],
      });

      const result = InsightsEngine.generate(input);
      const opp = result.find((i) => i.type === 'opportunity' && i.title.includes('Rare'));
      expect(opp).toBeUndefined();
    });
  });

  // Rule 2: Monthly goal at risk
  describe('Rule 2: Goal at risk', () => {
    it('should generate "warning" when minimum goal at risk', () => {
      const benchmarking = makeBenchmarking({
        goals: {
          vsMinimumGoal: { gap: 5000, progress: 50, onTrack: false },
          vsIdealGoal: { gap: 8000, progress: 40, onTrack: false },
        },
      });
      const input = makeInput({ benchmarking, averageShiftValue: 1500 });
      const result = InsightsEngine.generate(input);

      const warning = result.find((i) => i.type === 'warning' && i.title.includes('mínima'));
      expect(warning).toBeDefined();
      expect(warning!.priority).toBe(1);
      expect(warning!.description).toContain('plantão');
    });

    it('should generate "warning" for ideal goal when minimum is on track', () => {
      const benchmarking = makeBenchmarking({
        goals: {
          vsMinimumGoal: { gap: 0, progress: 100, onTrack: true },
          vsIdealGoal: { gap: 3000, progress: 80, onTrack: false },
        },
      });
      const input = makeInput({ benchmarking });
      const result = InsightsEngine.generate(input);

      const warning = result.find((i) => i.type === 'warning' && i.title.includes('ideal'));
      expect(warning).toBeDefined();
      expect(warning!.priority).toBe(2);
    });
  });

  // Rule 3: Revenue concentration >70%
  describe('Rule 3: Revenue concentration', () => {
    it('should generate "warning" when >70% in one hospital', () => {
      const input = makeInput({
        hospitalRoi: [
          makeHospitalRoi({ hospitalId: 'h1', hospitalName: 'Hospital Principal', totalRevenue: 8000 }),
          makeHospitalRoi({ hospitalId: 'h2', hospitalName: 'Hospital Secundario', totalRevenue: 1000 }),
        ],
      });

      const result = InsightsEngine.generate(input);
      const warning = result.find((i) => i.type === 'warning' && i.title.includes('Concentração'));
      expect(warning).toBeDefined();
      expect(warning!.description).toContain('Hospital Principal');
    });

    it('should not trigger when concentration is <= 70%', () => {
      const input = makeInput({
        hospitalRoi: [
          makeHospitalRoi({ hospitalId: 'h1', totalRevenue: 6000 }),
          makeHospitalRoi({ hospitalId: 'h2', totalRevenue: 4000 }),
        ],
      });

      const result = InsightsEngine.generate(input);
      const warning = result.find((i) => i.title.includes('Concentração'));
      expect(warning).toBeUndefined();
    });
  });

  // Rule 4: 3 months improvement → achievement
  describe('Rule 4: Consistent improvement', () => {
    it('should generate "achievement" when both revenue/hour and goal attainment are rising', () => {
      const benchmarking = makeBenchmarking({
        trends: { revenuePerHour: 'rising', workload: 'stable', goalAttainment: 'rising' },
        deltas: { vsLastMonth: { revenue: 15, hours: 5, revenuePerHour: 10 }, vsThreeMonthAvg: { revenue: 10, hours: 3, revenuePerHour: 7 } },
      });
      const input = makeInput({ benchmarking });
      const result = InsightsEngine.generate(input);

      const ach = result.find((i) => i.type === 'achievement' && i.title.includes('Evolução'));
      expect(ach).toBeDefined();
    });

    it('should generate "achievement" for rising revenue/hour only', () => {
      const benchmarking = makeBenchmarking({
        trends: { revenuePerHour: 'rising', workload: 'stable', goalAttainment: 'stable' },
      });
      const input = makeInput({ benchmarking });
      const result = InsightsEngine.generate(input);

      const ach = result.find((i) => i.type === 'achievement' && i.title.includes('Valor/hora'));
      expect(ach).toBeDefined();
    });
  });

  // Rule 5: Rising hours without revenue
  describe('Rule 5: Rising hours without revenue', () => {
    it('should generate "strategy" when hours rise but revenue/hour falls', () => {
      const benchmarking = makeBenchmarking({
        trends: { revenuePerHour: 'falling', workload: 'rising', goalAttainment: 'stable' },
        deltas: { vsLastMonth: { revenue: 5, hours: 20, revenuePerHour: -10 }, vsThreeMonthAvg: { revenue: 3, hours: 15, revenuePerHour: -8 } },
      });
      const input = makeInput({ benchmarking });
      const result = InsightsEngine.generate(input);

      const strat = result.find((i) => i.type === 'strategy' && i.title.includes('Horas subindo'));
      expect(strat).toBeDefined();
      expect(strat!.priority).toBe(2);
    });

    it('should not trigger when both hours and revenue/hour are rising', () => {
      const benchmarking = makeBenchmarking({
        trends: { revenuePerHour: 'rising', workload: 'rising', goalAttainment: 'rising' },
      });
      const input = makeInput({ benchmarking });
      const result = InsightsEngine.generate(input);

      const strat = result.find((i) => i.title.includes('Horas subindo'));
      expect(strat).toBeUndefined();
    });
  });

  // Rule 6: FlowScore risk + financial
  describe('Rule 6: FlowScore risk + financial', () => {
    it('should generate "strategy" for fatigue risk when goals are on track', () => {
      const benchmarking = makeBenchmarking({
        goals: {
          vsMinimumGoal: { gap: 0, progress: 100, onTrack: true },
          vsIdealGoal: { gap: 0, progress: 100, onTrack: true },
        },
      });
      const input = makeInput({ benchmarking, flowScoreLevel: 'PILAR_RISCO_FADIGA' });
      const result = InsightsEngine.generate(input);

      const strat = result.find((i) => i.type === 'strategy' && i.title.includes('redistribua'));
      expect(strat).toBeDefined();
      expect(strat!.priority).toBe(1);
    });

    it('should generate "strategy" for fatigue risk when goals are NOT on track', () => {
      const benchmarking = makeBenchmarking({
        goals: {
          vsMinimumGoal: { gap: 0, progress: 100, onTrack: true },
          vsIdealGoal: { gap: 3000, progress: 80, onTrack: false },
        },
      });
      const input = makeInput({ benchmarking, flowScoreLevel: 'PILAR_ALTO_RISCO' });
      const result = InsightsEngine.generate(input);

      const strat = result.find((i) => i.type === 'strategy' && i.title.includes('fadiga + meta'));
      expect(strat).toBeDefined();
      expect(strat!.description).toContain('maior valor');
    });

    it('should not trigger for sustainable FlowScore', () => {
      const input = makeInput({ flowScoreLevel: 'PILAR_SUSTENTAVEL' });
      const result = InsightsEngine.generate(input);

      const strat = result.find((i) => i.title.includes('fadiga'));
      expect(strat).toBeUndefined();
    });
  });
});
