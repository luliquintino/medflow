/**
 * Risk Engine
 * Regras baseadas em evidências de medicina do trabalho.
 * Totalmente separado de HTTP/banco.
 */

export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH';

export interface RiskInput {
  hoursInLast5Days: number;
  hoursInLastWeek: number;
  consecutiveNightShifts: number;
  hoursSinceLastShift: number | null; // null = sem plantão recente
  userMaxWeeklyHours?: number; // limite pessoal, se configurado
}

export interface RiskRule {
  id: string;
  triggered: boolean;
  level: RiskLevel;
  message: string;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;           // 0–100
  triggeredRules: string[];
  recommendation: string;
  rules: RiskRule[];
}

// ─── Regras ────────────────────────────────────────────────────────────────

const RULES = {
  HOURS_5_DAYS: (h: number): RiskRule => ({
    id: 'HOURS_5_DAYS',
    triggered: h >= 60,
    level: 'HIGH',
    message: `Você acumulou ${h}h nos últimos 5 dias (limite: 60h).`,
  }),
  HOURS_5_DAYS_MODERATE: (h: number): RiskRule => ({
    id: 'HOURS_5_DAYS_MODERATE',
    triggered: h >= 48 && h < 60,
    level: 'MODERATE',
    message: `Você acumulou ${h}h nos últimos 5 dias — fique de olho.`,
  }),
  HOURS_WEEK: (h: number): RiskRule => ({
    id: 'HOURS_WEEK',
    triggered: h >= 72,
    level: 'HIGH',
    message: `Você está com ${h}h na semana (limite recomendado: 72h).`,
  }),
  HOURS_WEEK_MODERATE: (h: number): RiskRule => ({
    id: 'HOURS_WEEK_MODERATE',
    triggered: h >= 56 && h < 72,
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
    message: h !== null
      ? `Apenas ${Math.round(h)}h de descanso desde o último plantão (mínimo recomendado: 48h).`
      : '',
  }),
  SHORT_RECOVERY_MODERATE: (h: number | null): RiskRule => ({
    id: 'SHORT_RECOVERY_MODERATE',
    triggered: h !== null && h >= 48 && h < 72,
    level: 'MODERATE',
    message: h !== null
      ? `Intervalo de ${Math.round(h)}h desde o último plantão — ideal seria 72h.`
      : '',
  }),
  PERSONAL_LIMIT: (h: number, limit?: number): RiskRule => ({
    id: 'PERSONAL_LIMIT',
    triggered: limit !== undefined && h > limit,
    level: 'MODERATE',
    message: limit
      ? `Você definiu um limite pessoal de ${limit}h/semana e está com ${h}h.`
      : '',
  }),
};

// ─── Engine ────────────────────────────────────────────────────────────────

export class RiskEngine {
  static evaluate(input: RiskInput): RiskResult {
    const allRules: RiskRule[] = [
      RULES.HOURS_5_DAYS(input.hoursInLast5Days),
      RULES.HOURS_5_DAYS_MODERATE(input.hoursInLast5Days),
      RULES.HOURS_WEEK(input.hoursInLastWeek),
      RULES.HOURS_WEEK_MODERATE(input.hoursInLastWeek),
      RULES.CONSECUTIVE_NIGHTS(input.consecutiveNightShifts),
      RULES.CONSECUTIVE_NIGHTS_MODERATE(input.consecutiveNightShifts),
      RULES.SHORT_RECOVERY(input.hoursSinceLastShift),
      RULES.SHORT_RECOVERY_MODERATE(input.hoursSinceLastShift),
      RULES.PERSONAL_LIMIT(input.hoursInLastWeek, input.userMaxWeeklyHours),
    ];

    const triggered = allRules.filter((r) => r.triggered);
    const triggeredIds = triggered.map((r) => r.id);

    const hasHigh = triggered.some((r) => r.level === 'HIGH');
    const hasModerate = triggered.some((r) => r.level === 'MODERATE');

    let level: RiskLevel = 'SAFE';
    if (hasHigh) level = 'HIGH';
    else if (hasModerate) level = 'MODERATE';

    // Score: rough calculation
    let score = 0;
    score += Math.min(40, (input.hoursInLast5Days / 60) * 40);
    score += Math.min(30, (input.hoursInLastWeek / 72) * 30);
    score += Math.min(20, (input.consecutiveNightShifts / 3) * 20);
    if (input.hoursSinceLastShift !== null && input.hoursSinceLastShift < 48) {
      score += 10;
    }
    score = Math.round(Math.min(100, score));

    const recommendation = this.buildRecommendation(level, triggered);

    return { level, score, triggeredRules: triggeredIds, recommendation, rules: allRules };
  }

  private static buildRecommendation(
    level: RiskLevel,
    triggered: RiskRule[],
  ): string {
    if (level === 'SAFE') {
      return 'Você está dentro de um ritmo saudável. Continue assim — seu corpo agradece.';
    }

    if (level === 'MODERATE') {
      const msgs = triggered.map((r) => r.message).filter(Boolean);
      return (
        'Atenção: ' +
        msgs[0] +
        ' Que tal planejar uma folga antes do próximo plantão?'
      );
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
