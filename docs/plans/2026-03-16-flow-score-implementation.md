# Flow Score Unification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify RiskLevel + exhaustion score into a single 4-level Flow Score (Equilibrado/Moderado/Intenso/Exaustivo) across the entire Med Flow application.

**Architecture:** Refactor in-place — modify existing WorkloadEngine and RiskEngine to produce FlowScore instead of RiskLevel. New fatigue weights (1.0/1.4/2.2/2.4). Prisma migration for new enum + fields. Frontend updated across all pages.

**Tech Stack:** NestJS, Prisma, TypeScript, Next.js 14, next-intl, recharts, Tailwind CSS

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma:29-33` (replace RiskLevel enum)
- Modify: `backend/prisma/schema.prisma:138-158` (WorkProfile model)
- Modify: `backend/prisma/schema.prisma:240-258` (RiskHistory model)

**Step 1: Update the schema**

In `backend/prisma/schema.prisma`, replace the `RiskLevel` enum:

```prisma
enum FlowScore {
  EQUILIBRADO
  MODERADO
  INTENSO
  EXAUSTIVO
}
```

In `WorkProfile` model, add two new fields after `energyCost24h`:

```prisma
  energyCost24hInvertido Float    @default(2.4)  // 24h invertido
  maxNightShifts         Int      @default(2)     // max night shifts per week
```

In `RiskHistory` model, change `riskLevel` field type:

```prisma
  riskLevel       FlowScore   // was: RiskLevel
```

Remove the old `RiskLevel` enum entirely.

**Step 2: Generate and run migration**

Run:
```bash
cd backend && npx prisma migrate dev --name flow-score-unification
```

If there's existing data with old RiskLevel values, the migration may need a manual SQL step to map:
- `SAFE` → `EQUILIBRADO`
- `MODERATE` → `MODERADO`
- `HIGH` → `INTENSO`

**Step 3: Verify migration applied**

Run:
```bash
cd backend && npx prisma generate
```

Expected: Prisma Client regenerated with `FlowScore` enum available.

**Step 4: Commit**

```bash
git add backend/prisma/
git commit -m "feat: prisma migration — FlowScore enum replaces RiskLevel"
```

---

## Task 2: Update WorkloadEngine with New Fatigue Weights

**Files:**
- Modify: `backend/src/shifts/shifts.engine.ts`
- Test: `backend/src/shifts/__tests__/shifts.engine.spec.ts`

**Step 1: Write the failing test**

Add to `backend/src/shifts/__tests__/shifts.engine.spec.ts`:

```typescript
describe('new fatigue weights', () => {
  it('should use 1.4 for TWELVE_NIGHT instead of 1.5', () => {
    const shift = makeShift({
      date: new Date('2026-03-10T19:00:00'),
      type: 'TWELVE_NIGHT' as any,
      hours: 12,
    });
    const result = WorkloadEngine.calculateExhaustion([shift]);
    expect(result.breakdown[0].baseCost).toBe(1.4);
  });

  it('should differentiate TWENTY_FOUR (2.2) from TWENTY_FOUR_INVERTED (2.4)', () => {
    const shift24 = makeShift({
      date: new Date('2026-03-10T07:00:00'),
      type: 'TWENTY_FOUR' as any,
      hours: 24,
    });
    const shiftInv = makeShift({
      date: new Date('2026-03-12T19:00:00'),
      type: 'TWENTY_FOUR_INVERTED' as any,
      hours: 24,
    });
    const r1 = WorkloadEngine.calculateExhaustion([shift24]);
    const r2 = WorkloadEngine.calculateExhaustion([shiftInv]);
    expect(r1.breakdown[0].baseCost).toBe(2.2);
    expect(r2.breakdown[0].baseCost).toBe(2.4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest shifts.engine.spec --testNamePattern="new fatigue" --no-coverage`
Expected: FAIL (TWELVE_NIGHT returns 1.5 not 1.4, both 24h types return 2.5)

**Step 3: Update the engine**

In `backend/src/shifts/shifts.engine.ts`:

Update `EnergyCosts` interface (line 11-15):
```typescript
export interface EnergyCosts {
  diurno: number;       // default 1.0
  noturno: number;      // default 1.4
  h24: number;          // default 2.2
  h24Invertido: number; // default 2.4
}

export const DEFAULT_ENERGY_COSTS: EnergyCosts = {
  diurno: 1.0,
  noturno: 1.4,
  h24: 2.2,
  h24Invertido: 2.4,
};
```

Update `getBaseCost` function (line 82-93):
```typescript
function getBaseCost(type: ShiftType, costs: EnergyCosts): number {
  switch (type) {
    case 'TWELVE_NIGHT':
      return costs.noturno;
    case 'TWENTY_FOUR':
      return costs.h24;
    case 'TWENTY_FOUR_INVERTED':
      return costs.h24Invertido;
    case 'TWELVE_DAY':
    default:
      return costs.diurno;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest shifts.engine.spec --no-coverage`
Expected: ALL PASS

**Step 5: Fix any broken existing tests**

Some tests may have hardcoded expected values based on old weights (1.5 for noturno, 2.5 for 24h). Update those expected values.

**Step 6: Commit**

```bash
git add backend/src/shifts/
git commit -m "feat: update fatigue weights — differentiate 24h from 24h invertido"
```

---

## Task 3: Create FlowScore Calculator (Pure Function)

**Files:**
- Create: `backend/src/shifts/flow-score.engine.ts`
- Create: `backend/src/shifts/__tests__/flow-score.engine.spec.ts`

**Step 1: Write the failing tests**

Create `backend/src/shifts/__tests__/flow-score.engine.spec.ts`:

```typescript
import { calculateFlowScore, calculateWeeklyMetrics, generateInsights, FlowScoreLevel } from '../flow-score.engine';
import { ShiftData } from '../shifts.engine';

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

describe('FlowScore Engine', () => {
  const now = new Date('2026-03-15T12:00:00');

  describe('calculateWeeklyMetrics', () => {
    it('should return zero metrics for empty shifts', () => {
      const m = calculateWeeklyMetrics([], now);
      expect(m.weeklyHours).toBe(0);
      expect(m.nightShifts).toBe(0);
      expect(m.longShifts).toBe(0);
      expect(m.consecutiveShifts).toBe(0);
      expect(m.fatigueScore).toBe(0);
    });

    it('should count night shifts (TWELVE_NIGHT + TWENTY_FOUR_INVERTED)', () => {
      const shifts = [
        makeShift({ date: new Date('2026-03-10T19:00:00'), type: 'TWELVE_NIGHT' as any, hours: 12 }),
        makeShift({ id: 's2', date: new Date('2026-03-12T19:00:00'), type: 'TWENTY_FOUR_INVERTED' as any, hours: 24 }),
      ];
      const m = calculateWeeklyMetrics(shifts, now);
      expect(m.nightShifts).toBe(2);
    });

    it('should count long shifts (TWENTY_FOUR + TWENTY_FOUR_INVERTED)', () => {
      const shifts = [
        makeShift({ date: new Date('2026-03-10T07:00:00'), type: 'TWENTY_FOUR' as any, hours: 24 }),
        makeShift({ id: 's2', date: new Date('2026-03-13T19:00:00'), type: 'TWENTY_FOUR_INVERTED' as any, hours: 24 }),
      ];
      const m = calculateWeeklyMetrics(shifts, now);
      expect(m.longShifts).toBe(2);
    });

    it('should calculate fatigue score with new weights', () => {
      const shifts = [
        makeShift({ date: new Date('2026-03-10T07:00:00'), type: 'TWELVE_DAY' as any, hours: 12 }), // 1.0
        makeShift({ id: 's2', date: new Date('2026-03-12T19:00:00'), type: 'TWELVE_NIGHT' as any, hours: 12 }), // 1.4
      ];
      const m = calculateWeeklyMetrics(shifts, now);
      expect(m.fatigueScore).toBe(2.4);
    });
  });

  describe('calculateFlowScore', () => {
    it('should return EQUILIBRADO for light workload', () => {
      const score = calculateFlowScore({
        weeklyHours: 36, nightShifts: 0, longShifts: 1, consecutiveShifts: 1, fatigueScore: 2.0,
      });
      expect(score).toBe('EQUILIBRADO');
    });

    it('should return MODERADO for 49-60h week', () => {
      const score = calculateFlowScore({
        weeklyHours: 52, nightShifts: 1, longShifts: 1, consecutiveShifts: 2, fatigueScore: 5.0,
      });
      expect(score).toBe('MODERADO');
    });

    it('should return INTENSO for 61-72h or many nights', () => {
      const score = calculateFlowScore({
        weeklyHours: 64, nightShifts: 2, longShifts: 2, consecutiveShifts: 3, fatigueScore: 8.0,
      });
      expect(score).toBe('INTENSO');
    });

    it('should return EXAUSTIVO for >72h', () => {
      const score = calculateFlowScore({
        weeklyHours: 80, nightShifts: 4, longShifts: 3, consecutiveShifts: 5, fatigueScore: 12.0,
      });
      expect(score).toBe('EXAUSTIVO');
    });

    it('should use worst dimension — low hours but many nights = INTENSO', () => {
      const score = calculateFlowScore({
        weeklyHours: 36, nightShifts: 3, longShifts: 0, consecutiveShifts: 1, fatigueScore: 4.0,
      });
      expect(score).toBe('INTENSO');
    });
  });

  describe('generateInsights', () => {
    it('should return positive insight for EQUILIBRADO', () => {
      const insights = generateInsights(
        { weeklyHours: 36, nightShifts: 0, longShifts: 0, consecutiveShifts: 1, fatigueScore: 1.0 },
        'EQUILIBRADO',
      );
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toContain('equilibrad');
    });

    it('should return warning for exceeded hours', () => {
      const insights = generateInsights(
        { weeklyHours: 65, nightShifts: 1, longShifts: 2, consecutiveShifts: 2, fatigueScore: 7.0 },
        'INTENSO',
      );
      expect(insights.some(i => i.toLowerCase().includes('hora'))).toBe(true);
    });

    it('should warn about night shifts when ≥3', () => {
      const insights = generateInsights(
        { weeklyHours: 48, nightShifts: 3, longShifts: 0, consecutiveShifts: 2, fatigueScore: 5.0 },
        'INTENSO',
      );
      expect(insights.some(i => i.toLowerCase().includes('noturno'))).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest flow-score.engine.spec --no-coverage`
Expected: FAIL (module not found)

**Step 3: Implement the FlowScore engine**

Create `backend/src/shifts/flow-score.engine.ts`:

```typescript
/**
 * Flow Score Engine
 * Pure business logic for the unified Flow Score metric.
 * No external dependencies. Easy to test.
 */

import { ShiftType } from '@prisma/client';
import { ShiftData, EnergyCosts, DEFAULT_ENERGY_COSTS } from './shifts.engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FlowScoreLevel = 'EQUILIBRADO' | 'MODERADO' | 'INTENSO' | 'EXAUSTIVO';

export interface WeeklyMetrics {
  weeklyHours: number;
  nightShifts: number;
  longShifts: number;
  consecutiveShifts: number;
  fatigueScore: number;
}

export interface FlowScoreResult {
  metrics: WeeklyMetrics;
  flowScore: FlowScoreLevel;
  alerts: string[];
  insights: string[];
}

export interface ScenarioComparison {
  scenario: string;
  hours: number;
  flowScore: FlowScoreLevel;
  fatigueScore: number;
  nightShifts: number;
}

// ─── Fatigue Weights ────────────────────────────────────────────────────────

const FATIGUE_WEIGHTS: Record<ShiftType, number> = {
  TWELVE_DAY: 1.0,
  TWELVE_NIGHT: 1.4,
  TWENTY_FOUR: 2.2,
  TWENTY_FOUR_INVERTED: 2.4,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function isNightShift(type: ShiftType): boolean {
  return type === 'TWELVE_NIGHT' || type === 'TWENTY_FOUR_INVERTED';
}

function isLongShift(type: ShiftType): boolean {
  return type === 'TWENTY_FOUR' || type === 'TWENTY_FOUR_INVERTED';
}

// ─── Core Functions ─────────────────────────────────────────────────────────

export function calculateWeeklyMetrics(
  shifts: ShiftData[],
  now: Date = new Date(),
): WeeklyMetrics {
  const confirmed = shifts.filter((s) => s.status === 'CONFIRMED' && s.realized !== false);

  // Week boundaries (Monday–Sunday)
  const weekStart = new Date(now);
  const dow = weekStart.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekShifts = confirmed.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  const weeklyHours = weekShifts.reduce((sum, s) => sum + s.hours, 0);
  const nightShifts = weekShifts.filter((s) => isNightShift(s.type)).length;
  const longShifts = weekShifts.filter((s) => isLongShift(s.type)).length;
  const fatigueScore = weekShifts.reduce((sum, s) => sum + FATIGUE_WEIGHTS[s.type], 0);

  // Consecutive shifts (< 48h gap from most recent backwards)
  const sorted = [...confirmed].sort((a, b) => a.date.getTime() - b.date.getTime());
  let consecutiveShifts = 0;
  if (sorted.length > 0) {
    const reversed = [...sorted].reverse();
    let lastEnd: Date | null = null;
    for (const shift of reversed) {
      if (!lastEnd) {
        consecutiveShifts = 1;
        lastEnd = shift.endDate;
        continue;
      }
      const gapHours = (lastEnd.getTime() - shift.endDate.getTime()) / 36e5;
      if (gapHours <= 48) {
        consecutiveShifts++;
        lastEnd = shift.endDate;
      } else {
        break;
      }
    }
  }

  return {
    weeklyHours,
    nightShifts,
    longShifts,
    consecutiveShifts,
    fatigueScore: Math.round(fatigueScore * 10) / 10,
  };
}

export function calculateFlowScore(metrics: WeeklyMetrics): FlowScoreLevel {
  const { weeklyHours, nightShifts, longShifts, consecutiveShifts } = metrics;

  // Score each dimension independently, take worst
  const levels: FlowScoreLevel[] = [];

  // Hours dimension
  if (weeklyHours > 72) levels.push('EXAUSTIVO');
  else if (weeklyHours > 60) levels.push('INTENSO');
  else if (weeklyHours > 48) levels.push('MODERADO');
  else levels.push('EQUILIBRADO');

  // Night shifts dimension
  if (nightShifts >= 3) levels.push('INTENSO');
  else if (nightShifts >= 2) levels.push('MODERADO');
  else levels.push('EQUILIBRADO');

  // Long shifts dimension
  if (longShifts >= 3) levels.push('INTENSO');
  else if (longShifts >= 2) levels.push('MODERADO');
  else levels.push('EQUILIBRADO');

  // Consecutive shifts dimension
  if (consecutiveShifts >= 4) levels.push('EXAUSTIVO');
  else if (consecutiveShifts >= 3) levels.push('INTENSO');
  else if (consecutiveShifts > 2) levels.push('MODERADO');
  else levels.push('EQUILIBRADO');

  // Return worst level
  const priority: FlowScoreLevel[] = ['EXAUSTIVO', 'INTENSO', 'MODERADO', 'EQUILIBRADO'];
  return priority.find((p) => levels.includes(p)) ?? 'EQUILIBRADO';
}

export function generateInsights(
  metrics: WeeklyMetrics,
  flowScore: FlowScoreLevel,
): string[] {
  const insights: string[] = [];

  if (flowScore === 'EQUILIBRADO') {
    insights.push('Sua semana está equilibrada. Bom ritmo — seu corpo agradece!');
    return insights;
  }

  if (metrics.weeklyHours > 72) {
    insights.push(`Você está com ${metrics.weeklyHours}h na semana. Isso ultrapassa o limite seguro de 72h.`);
  } else if (metrics.weeklyHours > 60) {
    insights.push(`Essa semana está acima da sua meta de horas (${metrics.weeklyHours}h). Considere descansar.`);
  } else if (metrics.weeklyHours > 48) {
    insights.push(`Carga semanal elevada: ${metrics.weeklyHours}h. Tente equilibrar com folgas.`);
  }

  if (metrics.nightShifts >= 3) {
    insights.push(`Você ultrapassou o limite de plantões noturnos (${metrics.nightShifts}x). Seu ciclo circadiano precisa de recuperação.`);
  } else if (metrics.nightShifts >= 2) {
    insights.push(`${metrics.nightShifts} noturnos na semana — tente intercalar com diurnos.`);
  }

  if (metrics.consecutiveShifts >= 4) {
    insights.push('Sequência de plantões longa detectada. Planeje uma pausa antes do próximo.');
  } else if (metrics.consecutiveShifts >= 3) {
    insights.push('Atenção à sequência de plantões consecutivos. Um descanso ajuda na recuperação.');
  }

  if (metrics.longShifts >= 2) {
    insights.push(`${metrics.longShifts} plantões longos (24h) na semana aumentam significativamente a fadiga.`);
  }

  if (flowScore === 'EXAUSTIVO') {
    insights.push('Sua saúde é inegociável. Recomendamos fortemente uma pausa antes de aceitar novos plantões.');
  }

  return insights;
}

export function compareScenarios(
  scenarioA: { name: string; shifts: ShiftData[] },
  scenarioB: { name: string; shifts: ShiftData[] },
  now: Date = new Date(),
): ScenarioComparison[] {
  return [scenarioA, scenarioB].map((s) => {
    const metrics = calculateWeeklyMetrics(s.shifts, now);
    return {
      scenario: s.name,
      hours: metrics.weeklyHours,
      flowScore: calculateFlowScore(metrics),
      fatigueScore: metrics.fatigueScore,
      nightShifts: metrics.nightShifts,
    };
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest flow-score.engine.spec --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/src/shifts/flow-score.engine.ts backend/src/shifts/__tests__/flow-score.engine.spec.ts
git commit -m "feat: add FlowScore engine with pure calculation functions"
```

---

## Task 4: Refactor RiskEngine to Use FlowScore

**Files:**
- Modify: `backend/src/risk-engine/risk.engine.ts`
- Modify: `backend/src/risk-engine/__tests__/risk-engine.service.spec.ts`

**Step 1: Update risk.engine.ts**

Replace `RiskLevel` type with `FlowScoreLevel` import:

```typescript
import { FlowScoreLevel, calculateFlowScore, calculateWeeklyMetrics, generateInsights } from '../shifts/flow-score.engine';
```

Change all `RiskLevel` references to `FlowScoreLevel`:
- `RiskRule.level: FlowScoreLevel`
- `RiskResult.level: FlowScoreLevel`
- Map old levels: SAFE→EQUILIBRADO, MODERATE→MODERADO, HIGH→INTENSO

Add `flowScore` and `insights` to `RiskResult`:
```typescript
export interface RiskResult {
  level: FlowScoreLevel;
  score: number;
  triggeredRules: string[];
  recommendation: string;
  rules: RiskRule[];
  exhaustionScore: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
  insights: string[];
}
```

In `evaluate()`, after computing the score, use the new FlowScore calculator to determine the level:

```typescript
// After computing all rules and score...
const flowScore = calculateFlowScore({
  weeklyHours: input.hoursInLastWeek,
  nightShifts: input.consecutiveNightShifts,
  longShifts: /* count from shifts */,
  consecutiveShifts: /* from workload */,
  fatigueScore: exhaustionScore,
});

const insights = generateInsights({...metrics}, flowScore);

return {
  level: flowScore,
  score,
  // ... rest
  insights,
};
```

**Step 2: Update rule levels**

Map rule levels to new FlowScore levels:
- `'HIGH'` → `'INTENSO'`
- `'MODERATE'` → `'MODERADO'`
- `'SAFE'` → `'EQUILIBRADO'`

**Step 3: Update risk-engine.service.ts**

In `backend/src/risk-engine/risk-engine.service.ts`:

Update the `snapshotData` (line 58-68) to use `FlowScore` enum value:

```typescript
import { FlowScore } from '@prisma/client';

const snapshotData = {
  riskLevel: result.level as FlowScore, // now stores EQUILIBRADO/MODERADO/INTENSO/EXAUSTIVO
  // ...rest unchanged
};
```

Also update `getEnergyCosts` to include the new `h24Invertido` field:

```typescript
private getEnergyCosts(workProfile: any): EnergyCosts {
  if (!workProfile) return DEFAULT_ENERGY_COSTS;
  return {
    diurno: workProfile.energyCostDiurno ?? DEFAULT_ENERGY_COSTS.diurno,
    noturno: workProfile.energyCostNoturno ?? DEFAULT_ENERGY_COSTS.noturno,
    h24: workProfile.energyCost24h ?? DEFAULT_ENERGY_COSTS.h24,
    h24Invertido: workProfile.energyCost24hInvertido ?? DEFAULT_ENERGY_COSTS.h24Invertido,
  };
}
```

**Step 4: Fix existing tests**

Update `risk-engine.service.spec.ts` to expect FlowScore values instead of RiskLevel.

**Step 5: Run all backend tests**

Run: `cd backend && npx jest --no-coverage`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add backend/src/risk-engine/ backend/src/shifts/
git commit -m "refactor: RiskEngine now returns FlowScore instead of RiskLevel"
```

---

## Task 5: Update Optimization Engine

**Files:**
- Modify: `backend/src/optimization/optimization.engine.ts`
- Modify: `backend/src/optimization/__tests__/optimization.engine.spec.ts`

**Step 1: Replace RiskLevel references with FlowScore**

In `optimization.engine.ts`, replace all `'SAFE' | 'MODERATE' | 'HIGH'` with `FlowScoreLevel`:

```typescript
import { FlowScoreLevel } from '../shifts/flow-score.engine';
```

Update scenario ranking to use FlowScore levels:
- `SAFE` → `EQUILIBRADO`
- `MODERATE` → `MODERADO`
- `HIGH` → `INTENSO`

**Step 2: Update tests, run, commit**

Run: `cd backend && npx jest optimization --no-coverage`
Expected: ALL PASS

```bash
git add backend/src/optimization/
git commit -m "refactor: optimization engine uses FlowScore levels"
```

---

## Task 6: Update Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Replace RiskLevel with FlowScore**

```typescript
// Replace:
export type RiskLevel = "SAFE" | "MODERATE" | "HIGH";

// With:
export type FlowScore = "EQUILIBRADO" | "MODERADO" | "INTENSO" | "EXAUSTIVO";
```

Update all references from `RiskLevel` to `FlowScore` throughout the file:
- `RiskRule.level: FlowScore`
- `RiskResult.level: FlowScore`
- `OptimizationScenario.riskLevel: FlowScore` (rename to `flowScore`)

Add `insights: string[]` to `RiskResult`.

Add `WorkProfile` fields:
```typescript
export interface WorkProfile {
  // ...existing
  energyCost24hInvertido: number;
  maxNightShifts: number;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/
git commit -m "refactor: frontend types use FlowScore instead of RiskLevel"
```

---

## Task 7: Update FlowBadge Component (rename from RiskBadge)

**Files:**
- Modify: `frontend/src/components/ui/risk-badge.tsx` → rename to `flow-badge.tsx`

**Step 1: Create the new component**

Create `frontend/src/components/ui/flow-badge.tsx`:

```typescript
"use client";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import type { FlowScore } from "@/types";

interface FlowBadgeProps {
  level: FlowScore;
  size?: "sm" | "md";
  showDot?: boolean;
}

const CONFIG: Record<FlowScore, { key: string; dot: string; badge: string }> = {
  EQUILIBRADO: {
    key: "equilibrado",
    dot: "bg-moss-500",
    badge: "bg-moss-100 text-moss-700 border-moss-200",
  },
  MODERADO: {
    key: "moderado",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  INTENSO: {
    key: "intenso",
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  EXAUSTIVO: {
    key: "exaustivo",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

export function FlowBadge({ level, size = "md", showDot = true }: FlowBadgeProps) {
  const t = useTranslations("flowScore");
  const cfg = CONFIG[level] ?? CONFIG.EQUILIBRADO;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        cfg.badge,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {showDot && (
        <span className={clsx("rounded-full", cfg.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      )}
      {t(cfg.key)}
    </span>
  );
}
```

**Step 2: Keep risk-badge.tsx as a deprecated re-export temporarily**

Update `risk-badge.tsx` to re-export FlowBadge for backward compatibility:

```typescript
export { FlowBadge as RiskBadge } from "./flow-badge";
```

**Step 3: Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat: add FlowBadge component with 4-level color scheme"
```

---

## Task 8: Update i18n Translations

**Files:**
- Modify: `frontend/messages/pt-BR.json`
- Modify: `frontend/messages/en.json`

**Step 1: Add FlowScore translations to pt-BR.json**

Replace the `"risk"` section:

```json
"flowScore": {
  "equilibrado": "Equilibrado",
  "moderado": "Moderado",
  "intenso": "Intenso",
  "exaustivo": "Exaustivo"
},
```

Update `"nav"` section:
```json
"riskHistory": "Histórico de Flow Score",
```

Update `"riskHistory"` page section — rename keys:
```json
"riskHistory": {
  "title": "Histórico de Flow Score",
  "subtitle": "Acompanhe como sua carga de trabalho evoluiu ao longo do tempo.",
  "distributionTitle": "Distribuição de Flow Score",
  "safe": "Equilibrado",
  "moderate": "Moderado",
  "high": "Intenso",
  "emptyState": "Nenhum registro de Flow Score ainda. Seus dados aparecerão aqui conforme usar o app.",
  "scoreLabel": "Score: {score}/100",
  "hoursInWeek": "{hours}h na semana",
  "consecutiveNights": "{count} noturnos"
}
```

Add insights to `"settings"` section:
```json
"energyCost24hInvertido": "24h Invertido",
"energyCost24hInvertidoDesc": "Custo energético do plantão de 24h invertido"
```

**Step 2: Same changes in en.json**

```json
"flowScore": {
  "equilibrado": "Balanced",
  "moderado": "Moderate",
  "intenso": "Intense",
  "exaustivo": "Exhaustive"
},
```

**Step 3: Commit**

```bash
git add frontend/messages/
git commit -m "feat: add FlowScore i18n translations (PT-BR + EN)"
```

---

## Task 9: Update Dashboard Page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

**Step 1: Replace RiskBadge imports with FlowBadge**

Replace:
```typescript
import { RiskBadge } from "@/components/ui/risk-badge";
```
With:
```typescript
import { FlowBadge } from "@/components/ui/flow-badge";
```

**Step 2: Update risk KPI card**

Change the "Nível de Risco" KPI to show "Flow Score" with FlowBadge:

```typescript
<FlowBadge level={dashboard.risk?.level ?? "EQUILIBRADO"} />
```

**Step 3: Add insights section to dashboard**

If `dashboard.risk?.insights` exists and has items, show them below the workload card.

**Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/
git commit -m "feat: dashboard shows FlowScore badge and insights"
```

---

## Task 10: Update Simulate Page

**Files:**
- Modify: `frontend/src/app/(app)/simulate/page.tsx`

**Step 1: Replace RiskBadge with FlowBadge**

**Step 2: Update verdict logic**

Replace:
```typescript
if (r.risk.level === "HIGH") → if (r.risk.level === "INTENSO" || r.risk.level === "EXAUSTIVO")
if (r.risk.level === "MODERATE") → if (r.risk.level === "MODERADO")
```

**Step 3: Show insights from API**

Add insights section below workload card:

```typescript
{result.risk.insights?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Insights</CardTitle>
    </CardHeader>
    <ul className="space-y-2">
      {result.risk.insights.map((insight, i) => (
        <li key={i} className="text-sm text-gray-600 bg-sand-100 rounded-xl px-3 py-2">
          {insight}
        </li>
      ))}
    </ul>
  </Card>
)}
```

**Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/simulate/
git commit -m "feat: simulate page uses FlowScore with insights"
```

---

## Task 11: Update Risk History Page → Flow Score History

**Files:**
- Modify: `frontend/src/app/(app)/risk-history/page.tsx`
- Modify: `frontend/src/app/(app)/risk-history/_components/risk-distribution-chart.tsx`

**Step 1: Update page to use FlowBadge**

Replace `RiskBadge` imports with `FlowBadge`. Update the `RiskHistoryRecord` interface:

```typescript
interface RiskHistoryRecord {
  id: string;
  riskLevel: FlowScore; // was RiskLevel
  riskScore: number;
  // ...
}
```

**Step 2: Update distribution chart**

In `risk-distribution-chart.tsx`, update to support 4 levels:

```typescript
import type { FlowScore } from "@/types";

const LEVEL_COLORS: Record<FlowScore, string> = {
  EQUILIBRADO: "#638f46",
  MODERADO: "#f59e0b",
  INTENSO: "#f97316",
  EXAUSTIVO: "#ef4444",
};

const LEVEL_KEYS: FlowScore[] = ["EQUILIBRADO", "MODERADO", "INTENSO", "EXAUSTIVO"];
```

**Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/risk-history/
git commit -m "feat: risk history page uses FlowScore with 4 levels"
```

---

## Task 12: Update Settings + Onboarding

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx`
- Modify: `frontend/src/app/onboarding/page.tsx`

**Step 1: Settings — add 24h invertido slider**

In `settings/page.tsx`, add state and slider for `energyCost24hInvertido`:

```typescript
const [energyCost24hInv, setEnergyCost24hInv] = useState(2.4);
```

Add new `EnergyCostSlider` after the 24h slider:

```typescript
<EnergyCostSlider
  label={t("energyCost.cost24hInvertido")}
  description={t("energyCost.cost24hInvertidoDesc")}
  value={energyCost24hInv}
  onChange={setEnergyCost24hInv}
  defaultValue={2.4}
  min={0.5}
  max={5.0}
  step={0.1}
/>
```

Update defaults and save mutation to include `energyCost24hInvertido`.

**Step 2: Settings — update default values**

```typescript
const ENERGY_DEFAULTS = {
  energyCostDiurno: 1.0,
  energyCostNoturno: 1.4,      // was 1.5
  energyCost24h: 2.2,           // was 2.5
  energyCost24hInvertido: 2.4,  // new
};
```

**Step 3: Onboarding — add maxNightShifts field**

In `onboarding/page.tsx`, add to the Step 2 (Work Profile) form:

```typescript
<Input
  label={t("maxNightShifts")}
  type="number"
  placeholder="2"
  {...register("maxNightShifts")}
/>
```

Update the form schema to include `maxNightShifts`:
```typescript
maxNightShifts: z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : Number(v)),
  z.number().min(0).max(7).optional(),
),
```

Update energy cost defaults to match new weights:
```typescript
const ENERGY_DEFAULTS = {
  energyCostDiurno: 1.0,
  energyCostNoturno: 1.4,
  energyCost24h: 2.2,
  energyCost24hInvertido: 2.4,
};
```

Add the 24h invertido slider to the onboarding energy costs section.

**Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/settings/ frontend/src/app/onboarding/
git commit -m "feat: settings + onboarding support 24h invertido slider and maxNightShifts"
```

---

## Task 13: Update Smart Planner Page

**Files:**
- Modify: `frontend/src/app/(app)/smart-planner/page.tsx`

**Step 1: Replace RiskLevel references with FlowScore**

Change scenario display from `riskLevel` to `flowScore`, use `FlowBadge` component.

**Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/smart-planner/
git commit -m "feat: smart planner uses FlowScore badges"
```

---

## Task 14: Update Backend Users Service for New Fields

**Files:**
- Modify: `backend/src/users/users.service.ts`

**Step 1: Update onboarding to save new fields**

Ensure the onboarding endpoint saves `energyCost24hInvertido` and `maxNightShifts` from the request body.

**Step 2: Update work-profile PATCH**

Ensure the `PATCH /users/work-profile` endpoint accepts and saves `energyCost24hInvertido` and `maxNightShifts`.

**Step 3: Commit**

```bash
git add backend/src/users/
git commit -m "feat: users service supports energyCost24hInvertido and maxNightShifts"
```

---

## Task 15: Run Full Test Suite and Fix Breakages

**Step 1: Run all backend tests**

```bash
cd backend && npx jest --no-coverage
```

Fix any remaining `RiskLevel` references or test value mismatches.

**Step 2: Run frontend TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors from `RiskLevel` → `FlowScore` migration.

**Step 3: Run frontend tests**

```bash
cd frontend && npx jest --no-coverage
```

Fix any snapshot or assertion failures.

**Step 4: Commit all fixes**

```bash
git add -A
git commit -m "fix: resolve all test and type breakages from FlowScore migration"
```

---

## Task 16: Smoke Test + Visual Verification

**Step 1: Start backend and frontend**

```bash
cd backend && npm run start:dev &
cd frontend && npm run dev &
```

**Step 2: Verify each page loads**

- `/dashboard` — shows FlowBadge with correct level
- `/simulate` — form works, shows FlowScore in results + insights
- `/smart-planner` — scenarios show FlowBadge
- `/risk-history` — renamed title, 4-level chart
- `/settings` — 4 energy sliders (including 24h invertido)
- `/shifts` — calendar + list still work

**Step 3: Run the E2E tests**

```bash
cd backend && npx jest --config test/jest-e2e.json
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: FlowScore unification complete — all pages and tests passing"
```
