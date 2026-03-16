/**
 * FlowScore FRMS Engine
 * Core Fatigue Risk Management System logic.
 * All pure functions — no side effects, no DB access.
 */

import { ShiftType } from '@prisma/client';
import { ShiftData } from './shifts.engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FlowScoreLevel =
  | 'PILAR_SUSTENTAVEL'
  | 'PILAR_CARGA_ELEVADA'
  | 'PILAR_RISCO_FADIGA'
  | 'PILAR_ALTO_RISCO';

export interface WorkloadMetrics {
  hours7d: number;
  hours14d: number;
  hours28d: number;
  avgWeeklyHours28d: number;
  nightShifts7d: number;
  longShifts7d: number;
  consecutiveShifts: number;
  fatigueScore7d: number;
  fatigueScore14d: number;
  fatigueScore28d: number;
}

export interface RecoveryDebt {
  hoursSinceLastShift: number | null;
  restQuality: 'GOOD' | 'PARTIAL' | 'POOR';
  recoveryDebtHours: number;
  isRecovered: boolean;
}

export interface EvidenceCitation {
  factor: string;
  citation: string;
  summary: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FATIGUE_WEIGHTS: Record<ShiftType, number> = {
  TWELVE_DAY: 1.0,
  TWELVE_NIGHT: 1.4,
  TWENTY_FOUR: 2.2,
  TWENTY_FOUR_INVERTED: 2.4,
};

const REQUIRED_REST_HOURS: Record<ShiftType, number> = {
  TWELVE_DAY: 11,
  TWELVE_NIGHT: 24,
  TWENTY_FOUR: 48,
  TWENTY_FOUR_INVERTED: 48,
};

const CONSECUTIVE_GAP_THRESHOLD_HOURS = 48;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isNightShift(type: ShiftType): boolean {
  return type === 'TWELVE_NIGHT' || type === 'TWENTY_FOUR_INVERTED';
}

function isLongShift(type: ShiftType): boolean {
  return type === 'TWENTY_FOUR' || type === 'TWENTY_FOUR_INVERTED';
}

function confirmedShifts(shifts: ShiftData[]): ShiftData[] {
  return shifts.filter((s) => s.status === 'CONFIRMED' && s.realized !== false);
}

function shiftsInWindow(shifts: ShiftData[], now: Date, days: number): ShiftData[] {
  const cutoff = new Date(now.getTime() - days * 24 * 3600000);
  return shifts.filter((s) => s.date >= cutoff && s.date <= now);
}

// ─── calculateWorkloadMetrics ───────────────────────────────────────────────

export function calculateWorkloadMetrics(
  shifts: ShiftData[],
  now: Date,
): WorkloadMetrics {
  const confirmed = confirmedShifts(shifts);

  const window7d = shiftsInWindow(confirmed, now, 7);
  const window14d = shiftsInWindow(confirmed, now, 14);
  const window28d = shiftsInWindow(confirmed, now, 28);

  const hours7d = window7d.reduce((sum, s) => sum + s.hours, 0);
  const hours14d = window14d.reduce((sum, s) => sum + s.hours, 0);
  const hours28d = window28d.reduce((sum, s) => sum + s.hours, 0);

  const nightShifts7d = window7d.filter((s) => isNightShift(s.type)).length;
  const longShifts7d = window7d.filter((s) => isLongShift(s.type)).length;

  const fatigueScore7d = window7d.reduce((sum, s) => sum + FATIGUE_WEIGHTS[s.type], 0);
  const fatigueScore14d = window14d.reduce((sum, s) => sum + FATIGUE_WEIGHTS[s.type], 0);
  const fatigueScore28d = window28d.reduce((sum, s) => sum + FATIGUE_WEIGHTS[s.type], 0);

  // Consecutive shifts: streak going backwards from most recent with <48h gaps
  let consecutiveShifts = 0;
  if (confirmed.length > 0) {
    const sorted = [...confirmed].sort(
      (a, b) => b.endDate.getTime() - a.endDate.getTime(),
    );
    consecutiveShifts = 1;
    for (let i = 1; i < sorted.length; i++) {
      const gapHours =
        (sorted[i - 1].date.getTime() - sorted[i].endDate.getTime()) / 3600000;
      if (gapHours < CONSECUTIVE_GAP_THRESHOLD_HOURS) {
        consecutiveShifts++;
      } else {
        break;
      }
    }
  }

  return {
    hours7d,
    hours14d,
    hours28d,
    avgWeeklyHours28d: hours28d / 4,
    nightShifts7d,
    longShifts7d,
    consecutiveShifts,
    fatigueScore7d,
    fatigueScore14d,
    fatigueScore28d,
  };
}

// ─── calculateRecoveryDebt ──────────────────────────────────────────────────

export function calculateRecoveryDebt(
  shifts: ShiftData[],
  now: Date,
): RecoveryDebt {
  const confirmed = confirmedShifts(shifts);

  if (confirmed.length === 0) {
    return {
      hoursSinceLastShift: null,
      restQuality: 'GOOD',
      recoveryDebtHours: 0,
      isRecovered: true,
    };
  }

  // Find most recent shift by endDate
  const lastShift = confirmed.reduce((latest, s) =>
    s.endDate.getTime() > latest.endDate.getTime() ? s : latest,
  );

  const hoursSinceLastShift =
    (now.getTime() - lastShift.endDate.getTime()) / 3600000;
  const requiredRest = REQUIRED_REST_HOURS[lastShift.type];
  const recoveryDebtHours = Math.max(0, requiredRest - hoursSinceLastShift);

  let restQuality: 'GOOD' | 'PARTIAL' | 'POOR';
  if (recoveryDebtHours <= 0) {
    restQuality = 'GOOD';
  } else if (recoveryDebtHours <= 12) {
    restQuality = 'PARTIAL';
  } else {
    restQuality = 'POOR';
  }

  return {
    hoursSinceLastShift,
    restQuality,
    recoveryDebtHours,
    isRecovered: recoveryDebtHours <= 0,
  };
}

// ─── calculateFlowScore ────────────────────────────────────────────────────

const LEVEL_ORDER: FlowScoreLevel[] = [
  'PILAR_SUSTENTAVEL',
  'PILAR_CARGA_ELEVADA',
  'PILAR_RISCO_FADIGA',
  'PILAR_ALTO_RISCO',
];

function levelIndex(level: FlowScoreLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function worst(a: FlowScoreLevel, b: FlowScoreLevel): FlowScoreLevel {
  return levelIndex(a) >= levelIndex(b) ? a : b;
}

function classifyHours7d(hours: number): FlowScoreLevel {
  if (hours <= 48) return 'PILAR_SUSTENTAVEL';
  if (hours <= 60) return 'PILAR_CARGA_ELEVADA';
  if (hours <= 72) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyHours14d(hours: number): FlowScoreLevel {
  if (hours <= 96) return 'PILAR_SUSTENTAVEL';
  if (hours <= 120) return 'PILAR_CARGA_ELEVADA';
  if (hours <= 144) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyAvgWeekly28d(hours: number): FlowScoreLevel {
  if (hours <= 48) return 'PILAR_SUSTENTAVEL';
  if (hours <= 55) return 'PILAR_CARGA_ELEVADA';
  if (hours <= 65) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyNightShifts7d(count: number): FlowScoreLevel {
  if (count <= 1) return 'PILAR_SUSTENTAVEL';
  if (count === 2) return 'PILAR_CARGA_ELEVADA';
  if (count === 3) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyLongShifts7d(count: number): FlowScoreLevel {
  if (count <= 1) return 'PILAR_SUSTENTAVEL';
  if (count === 2) return 'PILAR_CARGA_ELEVADA';
  if (count === 3) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyConsecutive(count: number): FlowScoreLevel {
  if (count <= 2) return 'PILAR_SUSTENTAVEL';
  if (count === 3) return 'PILAR_CARGA_ELEVADA';
  if (count <= 5) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyRecoveryDebt(hours: number): FlowScoreLevel {
  if (hours <= 0) return 'PILAR_SUSTENTAVEL';
  if (hours <= 6) return 'PILAR_CARGA_ELEVADA';
  if (hours <= 12) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

function classifyFatigue7d(score: number): FlowScoreLevel {
  if (score < 4.0) return 'PILAR_SUSTENTAVEL';
  if (score < 7.0) return 'PILAR_CARGA_ELEVADA';
  if (score < 10.0) return 'PILAR_RISCO_FADIGA';
  return 'PILAR_ALTO_RISCO';
}

export function calculateFlowScore(
  workload: WorkloadMetrics,
  recovery: RecoveryDebt,
): FlowScoreLevel {
  let result: FlowScoreLevel = 'PILAR_SUSTENTAVEL';

  result = worst(result, classifyHours7d(workload.hours7d));
  result = worst(result, classifyHours14d(workload.hours14d));
  result = worst(result, classifyAvgWeekly28d(workload.avgWeeklyHours28d));
  result = worst(result, classifyNightShifts7d(workload.nightShifts7d));
  result = worst(result, classifyLongShifts7d(workload.longShifts7d));
  result = worst(result, classifyConsecutive(workload.consecutiveShifts));
  result = worst(result, classifyRecoveryDebt(recovery.recoveryDebtHours));
  result = worst(result, classifyFatigue7d(workload.fatigueScore7d));

  return result;
}

// ─── generateInsights ───────────────────────────────────────────────────────

export function generateInsights(
  workload: WorkloadMetrics,
  recovery: RecoveryDebt,
  flowScore: FlowScoreLevel,
): string[] {
  if (flowScore === 'PILAR_SUSTENTAVEL') {
    return [
      'Sua carga de trabalho está dentro de limites sustentáveis. Continue assim!',
    ];
  }

  const insights: string[] = [];

  if (workload.hours7d > 48) {
    insights.push(
      `Você está com ${workload.hours7d}h nos últimos 7 dias. Acima de 60h aumenta significativamente o risco de fadiga.`,
    );
  }

  if (workload.nightShifts7d >= 3) {
    insights.push(
      `Você ultrapassou o limite de plantões noturnos (${workload.nightShifts7d}x). Seu ciclo circadiano precisa de recuperação.`,
    );
  }

  if (workload.consecutiveShifts >= 3) {
    insights.push(
      `Sequência de ${workload.consecutiveShifts} plantões consecutivos detectada. Planeje uma pausa.`,
    );
  }

  if (workload.longShifts7d >= 2) {
    insights.push(
      `${workload.longShifts7d} plantões de 24h na semana aumentam significativamente a fadiga.`,
    );
  }

  if (recovery.recoveryDebtHours > 0) {
    insights.push(
      `Dívida de recuperação: ${Math.round(recovery.recoveryDebtHours)}h. Considere descansar antes do próximo plantão.`,
    );
  }

  if (workload.avgWeeklyHours28d > 55) {
    insights.push(
      `Nas últimas 4 semanas, sua média é de ${Math.round(workload.avgWeeklyHours28d)}h/semana. Risco de burnout.`,
    );
  }

  if (flowScore === 'PILAR_ALTO_RISCO') {
    insights.push(
      'Sua saúde é inegociável. Recomendamos fortemente uma pausa antes de aceitar novos plantões.',
    );
  }

  return insights;
}

// ─── getEvidence ────────────────────────────────────────────────────────────

export function getEvidence(
  workload: WorkloadMetrics,
  recovery: RecoveryDebt,
): EvidenceCitation[] {
  const citations: EvidenceCitation[] = [];

  if (workload.hours7d > 48) {
    citations.push({
      factor: 'hours',
      citation: 'ACGME Duty Hour Studies; Lockley et al., NEJM 2004',
      summary:
        'Médicos trabalhando mais de 60h semanais apresentam maior risco de fadiga e erros médicos.',
    });
  }

  if (workload.nightShifts7d >= 2) {
    citations.push({
      factor: 'nightShifts',
      citation: 'BMJ Occupational Health; Vetter et al., JAMA 2016',
      summary:
        'Trabalho noturno frequente está associado a distúrbios de sono e maior risco cardiovascular.',
    });
  }

  if (workload.consecutiveShifts >= 3) {
    citations.push({
      factor: 'consecutive',
      citation: 'Dawson & Reid, Nature 1997',
      summary:
        'Sequências prolongadas de trabalho sem descanso adequado reduzem performance cognitiva.',
    });
  }

  if (workload.longShifts7d >= 1) {
    citations.push({
      factor: 'longShifts',
      citation: 'Williamson & Feyer, Occup Environ Med 2000',
      summary:
        'Após 24h sem sono, a performance cognitiva equivale a BAC de 0.10%.',
    });
  }

  return citations;
}
