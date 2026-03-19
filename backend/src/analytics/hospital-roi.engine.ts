/**
 * Hospital ROI Engine
 * Pure business logic — no database, no HTTP, fully testable.
 * Calculates composite hospital scores: value/hour, volume, reliability.
 * Assigns tiers (ouro/prata/bronze) and generates PT-BR insights.
 */

export interface RoiShift {
  date: Date | string;
  value: number;
  hours: number;
  type: string;
  hospitalId: string;
}

export interface RoiHospital {
  id: string;
  name: string;
}

export interface HospitalRoiInput {
  shifts: RoiShift[];
  hospitals: RoiHospital[];
  now: Date;
}

export interface HospitalRoi {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  totalHours: number;
  revenuePerHour: number;
  avgShiftValue: number;
  shiftCount: number;
  reliabilityScore: number;   // 0-100
  hospitalScore: number;      // 0-100 composite
  hospitalTier: 'ouro' | 'prata' | 'bronze';
  insight: string;            // 1-line PT-BR
}

export interface HospitalRoiResult {
  hospitals: HospitalRoi[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Normalize a raw value into 0-100 given the min and max across all hospitals. */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 100; // single hospital or all identical → everyone gets 100
  return ((value - min) / (max - min)) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HospitalRoiEngine {
  static calculate(input: HospitalRoiInput): HospitalRoiResult {
    const { shifts, hospitals, now } = input;

    if (shifts.length === 0 || hospitals.length === 0) {
      return { hospitals: [] };
    }

    // Build hospital name map
    const nameMap = new Map<string, string>();
    for (const h of hospitals) {
      nameMap.set(h.id, h.name);
    }

    // Group shifts by hospitalId
    const grouped = new Map<string, RoiShift[]>();
    for (const s of shifts) {
      if (!s.hospitalId) continue;
      const arr = grouped.get(s.hospitalId) || [];
      arr.push(s);
      grouped.set(s.hospitalId, arr);
    }

    // Only score hospitals that have shifts
    const hospitalIds = Array.from(grouped.keys()).filter((id) =>
      nameMap.has(id),
    );

    if (hospitalIds.length === 0) {
      return { hospitals: [] };
    }

    // ── Raw metrics per hospital ─────────────────────────────────────────
    const rawMetrics = hospitalIds.map((id) => {
      const hShifts = grouped.get(id)!;
      const totalRevenue = hShifts.reduce((s, sh) => s + sh.value, 0);
      const totalHours = hShifts.reduce((s, sh) => s + sh.hours, 0);
      const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
      const avgShiftValue =
        hShifts.length > 0 ? totalRevenue / hShifts.length : 0;
      const shiftCount = hShifts.length;

      // Reliability sub-scores (raw, not yet normalized)
      const paymentConsistency = this.calcPaymentConsistency(hShifts);
      const shiftFrequency = this.calcShiftFrequency(hShifts, now);
      const recency = this.calcRecency(hShifts, now);

      // Reliability composite (equal weight to 3 sub-factors) — raw 0-100
      const reliabilityScore = round2(
        (paymentConsistency + shiftFrequency + recency) / 3,
      );

      return {
        hospitalId: id,
        hospitalName: nameMap.get(id) || 'Desconhecido',
        totalRevenue: round2(totalRevenue),
        totalHours: round2(totalHours),
        revenuePerHour: round2(revenuePerHour),
        avgShiftValue: round2(avgShiftValue),
        shiftCount,
        reliabilityScore,
        // raw values for normalization
        _rawValuePerHour: revenuePerHour,
        _rawVolume: shiftCount,
        _rawReliability: reliabilityScore,
      };
    });

    // ── Normalize sub-scores 0-100 relative to user's own hospitals ──────
    const vphs = rawMetrics.map((m) => m._rawValuePerHour);
    const vols = rawMetrics.map((m) => m._rawVolume);
    const rels = rawMetrics.map((m) => m._rawReliability);

    const vphMin = Math.min(...vphs);
    const vphMax = Math.max(...vphs);
    const volMin = Math.min(...vols);
    const volMax = Math.max(...vols);
    const relMin = Math.min(...rels);
    const relMax = Math.max(...rels);

    // ── Composite score + tier + insight ──────────────────────────────────
    const scored: (typeof rawMetrics[number] & {
      hospitalScore: number;
      hospitalTier: 'ouro' | 'prata' | 'bronze';
      insight: string;
    })[] = rawMetrics.map((m) => {
      const normVph = normalize(m._rawValuePerHour, vphMin, vphMax);
      const normVol = normalize(m._rawVolume, volMin, volMax);
      const normRel = normalize(m._rawReliability, relMin, relMax);

      // 50% value/hour + 25% volume + 25% reliability
      const hospitalScore = round2(
        normVph * 0.5 + normVol * 0.25 + normRel * 0.25,
      );

      return {
        ...m,
        hospitalScore,
        hospitalTier: 'bronze' as const, // placeholder, assigned below
        insight: '',                       // placeholder
      };
    });

    // Sort by score descending for tier assignment
    scored.sort((a, b) => b.hospitalScore - a.hospitalScore);

    // Tier: top 33% = ouro, middle = prata, bottom = bronze
    const total = scored.length;
    scored.forEach((h, i) => {
      const rank = i / total; // 0 = best
      if (rank < 1 / 3) {
        h.hospitalTier = 'ouro';
      } else if (rank < 2 / 3) {
        h.hospitalTier = 'prata';
      } else {
        h.hospitalTier = 'bronze';
      }
    });

    // Special case: single hospital always gets ouro
    if (total === 1) {
      scored[0].hospitalTier = 'ouro';
    }

    // Generate insights
    const bestVph =
      scored.reduce((best, h) =>
        h.revenuePerHour > best.revenuePerHour ? h : best,
      );
    const bestVolume =
      scored.reduce((best, h) =>
        h.shiftCount > best.shiftCount ? h : best,
      );

    for (const h of scored) {
      h.insight = this.generateInsight(h, bestVph, bestVolume, total);
    }

    // Map to output (strip internal fields)
    const result: HospitalRoi[] = scored.map(
      ({
        _rawValuePerHour: _v,
        _rawVolume: _vol,
        _rawReliability: _r,
        ...rest
      }) => rest,
    );

    return { hospitals: result };
  }

  // ── Reliability sub-scores (each 0-100) ────────────────────────────────

  /**
   * Payment consistency: lower stddev of shift values → more consistent → higher score.
   * Score = max(0, 100 - coefficientOfVariation * 100)
   */
  private static calcPaymentConsistency(shifts: RoiShift[]): number {
    if (shifts.length < 2) return 100; // single shift → perfectly consistent
    const values = shifts.map((s) => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 100;
    const cv = stddev(values) / mean; // coefficient of variation
    return Math.max(0, Math.min(100, 100 - cv * 100));
  }

  /**
   * Shift frequency: shifts per month. More shifts/month → higher score.
   * Scoring: 0 = 0, 1/month = 25, 4/month = 100 (linear, capped at 100).
   */
  private static calcShiftFrequency(shifts: RoiShift[], now: Date): number {
    if (shifts.length === 0) return 0;
    const dates = shifts.map((s) => new Date(s.date).getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);
    const spanMs = Math.max(now.getTime() - earliest, 1);
    const spanMonths = Math.max(spanMs / (30.44 * 24 * 60 * 60 * 1000), 1);
    const perMonth = shifts.length / spanMonths;
    return Math.min(100, (perMonth / 4) * 100);
  }

  /**
   * Recency: how recently the last shift was. More recent → higher score.
   * Score = max(0, 100 - daysSinceLast * (100/180))
   * (180 days = 0, 0 days = 100)
   */
  private static calcRecency(shifts: RoiShift[], now: Date): number {
    if (shifts.length === 0) return 0;
    const latest = Math.max(...shifts.map((s) => new Date(s.date).getTime()));
    const daysSince = (now.getTime() - latest) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.min(100, 100 - daysSince * (100 / 180)));
  }

  // ── Insight generation ─────────────────────────────────────────────────

  private static generateInsight(
    h: { hospitalId: string; revenuePerHour: number; shiftCount: number; reliabilityScore: number; hospitalTier: string; hospitalScore: number },
    bestVph: { hospitalId: string; revenuePerHour: number },
    bestVolume: { hospitalId: string; shiftCount: number },
    totalHospitals: number,
  ): string {
    // Single hospital
    if (totalHospitals === 1) {
      return 'Seu unico hospital — acompanhe a evolucao ao longo do tempo';
    }

    // Best revenue per hour
    if (h.hospitalId === bestVph.hospitalId && h.hospitalTier === 'ouro') {
      return 'Seu hospital mais rentavel por hora';
    }

    // High volume but low value
    if (
      h.hospitalId === bestVolume.hospitalId &&
      h.revenuePerHour < bestVph.revenuePerHour * 0.8
    ) {
      return 'Alto volume, mas valor/hora abaixo da media — negocie valores';
    }

    // Low reliability
    if (h.reliabilityScore < 40) {
      return 'Confiabilidade baixa — verifique consistencia de pagamentos';
    }

    // Bronze tier
    if (h.hospitalTier === 'bronze') {
      return 'Volume baixo — considere diversificar';
    }

    // Prata
    if (h.hospitalTier === 'prata') {
      return 'Desempenho intermediario — potencial de melhoria';
    }

    // Ouro default
    return 'Excelente desempenho geral';
  }
}
