/**
 * Strategic Insights Engine
 * Pure business logic — no database, no HTTP, fully testable.
 * Cross-references hospital ROI, benchmarking, and FlowScore data
 * to generate actionable strategic insights.
 */

import { HospitalRoi } from './hospital-roi.engine';
import { BenchmarkingResult, Trend } from './benchmarking.engine';
import { FlowScoreLevel } from '../shifts/flow-score.engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export type InsightType = 'opportunity' | 'warning' | 'achievement' | 'strategy';

export interface StrategicInsight {
  type: InsightType;
  priority: number; // 1-5 (1 = highest)
  title: string;
  description: string;
  metric?: { value: number; unit: string; trend?: Trend };
}

export interface InsightsInput {
  hospitalRoi: HospitalRoi[];
  benchmarking: BenchmarkingResult;
  flowScoreLevel: FlowScoreLevel;
  averageShiftValue?: number;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class InsightsEngine {
  static generate(input: InsightsInput): StrategicInsight[] {
    const insights: StrategicInsight[] = [];

    this.checkHospitalBelowAvg(input, insights);
    this.checkGoalAtRisk(input, insights);
    this.checkRevenueConcentration(input, insights);
    this.checkConsistentImprovement(input, insights);
    this.checkRisingHoursWithoutRevenue(input, insights);
    this.checkFlowScoreRisk(input, insights);

    // Sort by priority (1 = highest priority = first)
    insights.sort((a, b) => a.priority - b.priority);

    return insights;
  }

  // ── Rule 1: Hospital below personal avg value/hour ────────────────────

  private static checkHospitalBelowAvg(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { hospitalRoi } = input;
    if (hospitalRoi.length < 2) return;

    // Calculate user's overall average value/hour
    const totalRevenue = hospitalRoi.reduce((s, h) => s + h.totalRevenue, 0);
    const totalHours = hospitalRoi.reduce((s, h) => s + h.totalHours, 0);
    if (totalHours === 0) return;

    const avgRevenuePerHour = totalRevenue / totalHours;

    for (const h of hospitalRoi) {
      if (h.revenuePerHour < avgRevenuePerHour * 0.85 && h.shiftCount >= 2) {
        insights.push({
          type: 'opportunity',
          priority: 3,
          title: `${h.hospitalName} paga abaixo da sua média`,
          description: `Valor/hora de R$${h.revenuePerHour.toFixed(0)} está ${Math.round(((avgRevenuePerHour - h.revenuePerHour) / avgRevenuePerHour) * 100)}% abaixo da sua média pessoal de R$${avgRevenuePerHour.toFixed(0)}/h. Considere renegociar ou redistribuir plantões.`,
          metric: {
            value: round2(h.revenuePerHour),
            unit: 'R$/h',
          },
        });
      }
    }
  }

  // ── Rule 2: Monthly goal at risk ──────────────────────────────────────

  private static checkGoalAtRisk(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { benchmarking, averageShiftValue } = input;
    const { vsIdealGoal, vsMinimumGoal } = benchmarking.goals;

    // Minimum goal at risk
    if (!vsMinimumGoal.onTrack && vsMinimumGoal.gap > 0) {
      const extraShifts = averageShiftValue && averageShiftValue > 0
        ? Math.ceil(vsMinimumGoal.gap / averageShiftValue)
        : null;

      insights.push({
        type: 'warning',
        priority: 1,
        title: 'Meta mínima em risco',
        description: extraShifts
          ? `Faltam R$${vsMinimumGoal.gap.toFixed(0)} para a meta mínima. Aproximadamente ${extraShifts} plantão(ões) extra(s) fechariam o gap.`
          : `Faltam R$${vsMinimumGoal.gap.toFixed(0)} para a meta mínima.`,
        metric: {
          value: round2(vsMinimumGoal.progress),
          unit: '%',
        },
      });
    }
    // Ideal goal at risk but minimum on track
    else if (!vsIdealGoal.onTrack && vsIdealGoal.gap > 0) {
      const extraShifts = averageShiftValue && averageShiftValue > 0
        ? Math.ceil(vsIdealGoal.gap / averageShiftValue)
        : null;

      insights.push({
        type: 'warning',
        priority: 2,
        title: 'Meta ideal ainda não atingida',
        description: extraShifts
          ? `Faltam R$${vsIdealGoal.gap.toFixed(0)} para a meta ideal. Mais ${extraShifts} plantão(ões) resolveriam.`
          : `Faltam R$${vsIdealGoal.gap.toFixed(0)} para a meta ideal.`,
        metric: {
          value: round2(vsIdealGoal.progress),
          unit: '%',
        },
      });
    }
  }

  // ── Rule 3: Revenue concentration >70% in 1 hospital ─────────────────

  private static checkRevenueConcentration(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { hospitalRoi } = input;
    if (hospitalRoi.length < 2) return;

    const totalRevenue = hospitalRoi.reduce((s, h) => s + h.totalRevenue, 0);
    if (totalRevenue === 0) return;

    for (const h of hospitalRoi) {
      const share = (h.totalRevenue / totalRevenue) * 100;
      if (share > 70) {
        insights.push({
          type: 'warning',
          priority: 2,
          title: 'Concentração de receita elevada',
          description: `${Math.round(share)}% da sua receita vem de ${h.hospitalName}. Diversificar reduz risco caso haja mudanças.`,
          metric: {
            value: Math.round(share),
            unit: '%',
          },
        });
        break; // only one concentration warning
      }
    }
  }

  // ── Rule 4: 3 months improvement → achievement ────────────────────────

  private static checkConsistentImprovement(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { benchmarking } = input;
    const { trends, deltas } = benchmarking;

    // Check if revenue per hour is rising and goal attainment is rising
    if (
      trends.revenuePerHour === 'rising' &&
      trends.goalAttainment === 'rising'
    ) {
      insights.push({
        type: 'achievement',
        priority: 4,
        title: 'Evolução consistente detectada',
        description: `Seu valor/hora e atingimento de metas estão em tendência de alta. Continue assim!`,
        metric: {
          value: round2(deltas.vsLastMonth.revenuePerHour),
          unit: '%',
          trend: 'rising',
        },
      });
    } else if (trends.revenuePerHour === 'rising') {
      insights.push({
        type: 'achievement',
        priority: 5,
        title: 'Valor/hora em crescimento',
        description: `Seu valor por hora está crescendo — sinal de boa negociação ou mix de plantões.`,
        metric: {
          value: round2(deltas.vsLastMonth.revenuePerHour),
          unit: '%',
          trend: 'rising',
        },
      });
    }
  }

  // ── Rule 5: Rising hours without proportional revenue ─────────────────

  private static checkRisingHoursWithoutRevenue(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { benchmarking } = input;
    const { trends, deltas } = benchmarking;

    // Hours going up but revenue per hour is falling or stable
    if (
      trends.workload === 'rising' &&
      (trends.revenuePerHour === 'falling' || trends.revenuePerHour === 'stable')
    ) {
      insights.push({
        type: 'strategy',
        priority: 2,
        title: 'Horas subindo sem retorno proporcional',
        description: `Suas horas trabalhadas estão aumentando, mas o valor/hora não acompanha. Considere priorizar plantões mais rentáveis.`,
        metric: {
          value: round2(deltas.vsLastMonth.hours),
          unit: '% horas',
          trend: 'rising',
        },
      });
    }
  }

  // ── Rule 6: FlowScore risk + financial optimization ───────────────────

  private static checkFlowScoreRisk(
    input: InsightsInput,
    insights: StrategicInsight[],
  ): void {
    const { flowScoreLevel, benchmarking } = input;

    // Only trigger for elevated risk levels
    if (
      flowScoreLevel === 'PILAR_RISCO_FADIGA' ||
      flowScoreLevel === 'PILAR_ALTO_RISCO'
    ) {
      const isGoalOnTrack = benchmarking.goals.vsIdealGoal.onTrack;

      if (isGoalOnTrack) {
        insights.push({
          type: 'strategy',
          priority: 1,
          title: 'Risco de fadiga: redistribua plantões',
          description: `Seu FlowScore indica risco de fadiga, mas suas metas já estão em dia. Considere redistribuir plantões para descansar sem impacto financeiro.`,
        });
      } else {
        insights.push({
          type: 'strategy',
          priority: 1,
          title: 'Risco de fadiga + meta em aberto',
          description: `Seu FlowScore indica carga elevada e a meta ideal ainda não foi atingida. Priorize plantões de maior valor para fechar a meta com menos horas.`,
        });
      }
    }
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
