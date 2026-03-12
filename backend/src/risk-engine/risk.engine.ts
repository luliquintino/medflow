/**
 * Risk Engine
 * Regras baseadas em evidências de medicina do trabalho.
 * Inclui score de exaustão e índice de sustentabilidade.
 * Totalmente separado de HTTP/banco.
 */

import {
  EnergyCosts,
  DEFAULT_ENERGY_COSTS,
  ShiftExhaustion,
  WorkloadEngine,
} from '../shifts/shifts.engine';

export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH';

export interface RiskInput {
  hoursInLastWeek: number;
  consecutiveNightShifts: number;
  hoursSinceLastShift: number | null; // null = sem plantão recente
  userMaxWeeklyHours?: number; // limite pessoal, se configurado
  // Exhaustion inputs
  shifts?: Array<{
    date: Date;
    endDate: Date;
    type: string;
    hours: number;
    value: number;
    status: string;
  }>;
  energyCosts?: EnergyCosts;
  revenueThisMonth?: number;
}

export interface RiskRule {
  id: string;
  triggered: boolean;
  level: RiskLevel;
  message: string;
}

export interface RiskResult {
  level: RiskLevel;
  score: number; // 0–100
  triggeredRules: string[];
  recommendation: string;
  rules: RiskRule[];
  // Exhaustion metrics
  exhaustionScore: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
}

// ─── Exhaustion limit ──────────────────────────────────────────────────────

const EXHAUSTION_WEEKLY_LIMIT = 10.0; // max sustainable exhaustion per week

// ─── Regras ────────────────────────────────────────────────────────────────

const RULES = {
  HOURS_WEEK: (h: number): RiskRule => ({
    id: 'HOURS_WEEK',
    triggered: h >= 60,
    level: 'HIGH',
    message: `Você está com ${h}h na semana (limite recomendado: 60h).`,
  }),
  HOURS_WEEK_MODERATE: (h: number): RiskRule => ({
    id: 'HOURS_WEEK_MODERATE',
    triggered: h >= 44 && h < 60,
    level: 'MODERATE',
    message: `Carga semanal elevada: ${h}h. Considere um descanso.`,
  }),
  CONSECUTIVE_NIGHTS: (n: number): RiskRule => ({
    id: 'CONSECUTIVE_NIGHTS',
    triggered: n >= 3,
    level: 'HIGH',
    message: `${n} noturnos consecutivos são prejudiciais ao ciclo circadiano.`,
  }),
  CONSECUTIVE_NIGHTS_MODERATE: (n: number): RiskRule => ({
    id: 'CONSECUTIVE_NIGHTS_MODERATE',
    triggered: n === 2,
    level: 'MODERATE',
    message: `2 noturnos seguidos — tente intercalar com diurnos ou folga.`,
  }),
  SHORT_RECOVERY: (h: number | null): RiskRule => ({
    id: 'SHORT_RECOVERY',
    triggered: h !== null && h < 48,
    level: 'HIGH',
    message:
      h !== null
        ? `Apenas ${Math.round(h)}h de descanso desde o último plantão (mínimo recomendado: 48h).`
        : '',
  }),
  SHORT_RECOVERY_MODERATE: (h: number | null): RiskRule => ({
    id: 'SHORT_RECOVERY_MODERATE',
    triggered: h !== null && h >= 48 && h < 72,
    level: 'MODERATE',
    message:
      h !== null ? `Intervalo de ${Math.round(h)}h desde o último plantão — ideal seria 72h.` : '',
  }),
  PERSONAL_LIMIT: (h: number, limit?: number): RiskRule => ({
    id: 'PERSONAL_LIMIT',
    triggered: limit !== undefined && h > limit,
    level: 'MODERATE',
    message: limit ? `Você definiu um limite pessoal de ${limit}h/semana e está com ${h}h.` : '',
  }),
  HIGH_EXHAUSTION: (score: number): RiskRule => ({
    id: 'HIGH_EXHAUSTION',
    triggered: score >= EXHAUSTION_WEEKLY_LIMIT,
    level: 'HIGH',
    message: `Score de exaustão ${score.toFixed(1)} excede o limite sustentável (${EXHAUSTION_WEEKLY_LIMIT}).`,
  }),
  MODERATE_EXHAUSTION: (score: number): RiskRule => ({
    id: 'MODERATE_EXHAUSTION',
    triggered: score >= EXHAUSTION_WEEKLY_LIMIT * 0.7 && score < EXHAUSTION_WEEKLY_LIMIT,
    level: 'MODERATE',
    message: `Score de exaustão ${score.toFixed(1)} se aproxima do limite sustentável (${EXHAUSTION_WEEKLY_LIMIT}).`,
  }),
};

// ─── Engine ────────────────────────────────────────────────────────────────

export class RiskEngine {
  static evaluate(input: RiskInput): RiskResult {
    // Calculate exhaustion if shifts provided
    const costs = input.energyCosts ?? DEFAULT_ENERGY_COSTS;
    let exhaustionScore = 0;
    let sustainabilityIndex = 0;
    let shiftExhaustionBreakdown: ShiftExhaustion[] = [];

    if (input.shifts && input.shifts.length > 0) {
      const exhaustion = WorkloadEngine.calculateExhaustion(input.shifts as any, costs);
      exhaustionScore = exhaustion.totalExhaustion;
      shiftExhaustionBreakdown = exhaustion.breakdown;

      const revenue = input.revenueThisMonth ?? 0;
      sustainabilityIndex = exhaustionScore > 0 ? Math.round(revenue / exhaustionScore) : 0;
    }

    const allRules: RiskRule[] = [
      RULES.HOURS_WEEK(input.hoursInLastWeek),
      RULES.HOURS_WEEK_MODERATE(input.hoursInLastWeek),
      RULES.CONSECUTIVE_NIGHTS(input.consecutiveNightShifts),
      RULES.CONSECUTIVE_NIGHTS_MODERATE(input.consecutiveNightShifts),
      RULES.SHORT_RECOVERY(input.hoursSinceLastShift),
      RULES.SHORT_RECOVERY_MODERATE(input.hoursSinceLastShift),
      RULES.PERSONAL_LIMIT(input.hoursInLastWeek, input.userMaxWeeklyHours),
      RULES.HIGH_EXHAUSTION(exhaustionScore),
      RULES.MODERATE_EXHAUSTION(exhaustionScore),
    ];

    const triggered = allRules.filter((r) => r.triggered);
    const triggeredIds = triggered.map((r) => r.id);

    const hasHigh = triggered.some((r) => r.level === 'HIGH');
    const hasModerate = triggered.some((r) => r.level === 'MODERATE');

    let level: RiskLevel = 'SAFE';
    if (hasHigh) level = 'HIGH';
    else if (hasModerate) level = 'MODERATE';

    // Score: 4 dimensions (40+20+15+25=100)
    let score = 0;
    score += Math.min(40, (input.hoursInLastWeek / 60) * 40);
    score += Math.min(20, (input.consecutiveNightShifts / 3) * 20);
    if (input.hoursSinceLastShift !== null && input.hoursSinceLastShift < 48) {
      score += 15;
    }
    score += Math.min(25, (exhaustionScore / EXHAUSTION_WEEKLY_LIMIT) * 25);
    score = Math.round(Math.min(100, score));

    const recommendation = this.buildRecommendation(level, triggered);

    return {
      level,
      score,
      triggeredRules: triggeredIds,
      recommendation,
      rules: allRules,
      exhaustionScore: Math.round(exhaustionScore * 10) / 10,
      sustainabilityIndex,
      shiftExhaustionBreakdown,
    };
  }

  private static buildRecommendation(level: RiskLevel, triggered: RiskRule[]): string {
    if (level === 'SAFE') {
      return 'Você está dentro de um ritmo saudável. Continue assim — seu corpo agradece.';
    }

    if (level === 'MODERATE') {
      const msgs = triggered.map((r) => r.message).filter(Boolean);
      return 'Atenção: ' + msgs[0] + ' Que tal planejar uma folga antes do próximo plantão?';
    }

    // HIGH
    const msgs = triggered.map((r) => r.message).filter(Boolean);
    return (
      'Sinal de alerta: ' +
      msgs[0] +
      ' Recomendamos fortemente uma pausa antes de aceitar novos plantões. Sua saúde é inegociável.'
    );
  }
}
