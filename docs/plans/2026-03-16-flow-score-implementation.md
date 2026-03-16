# Flow Score FRMS — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Fatigue Risk Management System (FRMS) that unifies workload metrics (7/14/28 days), recovery debt, and flow score into a single evidence-based fatigue classification. Replace RiskLevel with FlowScore across the entire app.

**Architecture:** New `flow-score.engine.ts` with pure functions for multi-window workload, recovery debt, and flow score. Refactor RiskEngine to delegate to FlowScore. Update all frontend pages. Prisma migration for new enum + fields.

**Tech Stack:** NestJS, Prisma, TypeScript, Next.js 14, next-intl, recharts, Tailwind CSS

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Update the schema**

Replace `RiskLevel` enum with:

```prisma
enum FlowScore {
  PILAR_SUSTENTAVEL
  PILAR_CARGA_ELEVADA
  PILAR_RISCO_FADIGA
  PILAR_ALTO_RISCO
}
```

In `WorkProfile` model, add after `energyCost24h`:

```prisma
  energyCost24hInvertido Float    @default(2.4)
  maxNightShifts         Int      @default(2)
```

In `RiskHistory` model, change `riskLevel` type from `RiskLevel` to `FlowScore`.

Remove old `RiskLevel` enum.

**Step 2: Generate and run migration**

```bash
cd backend && npx prisma migrate dev --name flow-score-frms
```

The migration SQL should map existing data:
- `SAFE` → `PILAR_SUSTENTAVEL`
- `MODERATE` → `PILAR_CARGA_ELEVADA`
- `HIGH` → `PILAR_RISCO_FADIGA`

**Step 3: Verify**

```bash
cd backend && npx prisma generate
```

**Step 4: Commit**

```bash
git add backend/prisma/
git commit -m "feat: prisma migration — FlowScore FRMS enum replaces RiskLevel"
```

---

## Task 2: Update WorkloadEngine Fatigue Weights

**Files:**
- Modify: `backend/src/shifts/shifts.engine.ts`
- Modify: `backend/src/shifts/__tests__/shifts.engine.spec.ts`

**Step 1: Write failing tests**

Add to `shifts.engine.spec.ts`:

```typescript
describe('updated fatigue weights', () => {
  it('TWELVE_NIGHT base cost = 1.4', () => {
    const shift = makeShift({ date: new Date('2026-03-10T19:00:00'), type: 'TWELVE_NIGHT' as any, hours: 12 });
    const result = WorkloadEngine.calculateExhaustion([shift]);
    expect(result.breakdown[0].baseCost).toBe(1.4);
  });

  it('TWENTY_FOUR base cost = 2.2', () => {
    const shift = makeShift({ date: new Date('2026-03-10T07:00:00'), type: 'TWENTY_FOUR' as any, hours: 24 });
    const result = WorkloadEngine.calculateExhaustion([shift]);
    expect(result.breakdown[0].baseCost).toBe(2.2);
  });

  it('TWENTY_FOUR_INVERTED base cost = 2.4', () => {
    const shift = makeShift({ date: new Date('2026-03-10T19:00:00'), type: 'TWENTY_FOUR_INVERTED' as any, hours: 24 });
    const result = WorkloadEngine.calculateExhaustion([shift]);
    expect(result.breakdown[0].baseCost).toBe(2.4);
  });
});
```

**Step 2: Run test → FAIL**

```bash
cd backend && npx jest shifts.engine.spec --testNamePattern="updated fatigue" --no-coverage
```

**Step 3: Update the engine**

Update `EnergyCosts` interface to add `h24Invertido: number` (default 2.4).
Update `DEFAULT_ENERGY_COSTS`: `noturno: 1.4`, `h24: 2.2`, `h24Invertido: 2.4`.
Update `getBaseCost()` to differentiate `TWENTY_FOUR_INVERTED` from `TWENTY_FOUR`.

**Step 4: Run tests → PASS, fix hardcoded old values**

```bash
cd backend && npx jest shifts.engine.spec --no-coverage
```

**Step 5: Commit**

```bash
git add backend/src/shifts/
git commit -m "feat: differentiated fatigue weights — 1.0/1.4/2.2/2.4"
```

---

## Task 3: Create FlowScore Engine (Core FRMS Logic)

**Files:**
- Create: `backend/src/shifts/flow-score.engine.ts`
- Create: `backend/src/shifts/__tests__/flow-score.engine.spec.ts`

This is the core of the FRMS. Pure functions, no dependencies.

**Step 1: Write comprehensive tests** (see design doc for full test file)

Tests cover:
- `calculateWorkloadMetrics()` — 7/14/28 day windows
- `calculateRecoveryDebt()` — rest requirements per shift type
- `calculateFlowScore()` — 4-level classification with worst-of logic
- `generateInsights()` — PT-BR contextual messages
- `getEvidence()` — scientific citations

**Step 2: Run → FAIL**

**Step 3: Implement**

Key structures:
```typescript
// WorkloadMetrics: hours7d, hours14d, hours28d, avgWeeklyHours28d, nightShifts7d, longShifts7d, consecutiveShifts, fatigueScore7d/14d/28d
// RecoveryDebt: hoursSinceLastShift, restQuality, recoveryDebtHours, isRecovered
// FlowScoreLevel: 'PILAR_SUSTENTAVEL' | 'PILAR_CARGA_ELEVADA' | 'PILAR_RISCO_FADIGA' | 'PILAR_ALTO_RISCO'
// Evidence: { factor, citation, summary }
```

Classification rules (worst-of across all dimensions):

| Dimension | Sustentável | Carga Elevada | Risco Fadiga | Alto Risco |
|-----------|-------------|---------------|-------------|------------|
| hours7d | ≤48h | 49-60h | 61-72h | >72h |
| hours14d | ≤96h | 97-120h | 121-144h | >144h |
| avgWeekly28d | ≤48h | 49-55h | 56-65h | >65h |
| nightShifts7d | ≤1 | 2 | 3 | ≥4 |
| longShifts7d | ≤1 | 2 | 3 | ≥4 |
| consecutive | ≤2 | 3 | 4-5 | ≥6 |
| recoveryDebt | 0h | 1-6h | 7-12h | >12h |
| fatigue7d | <4.0 | 4.0-6.9 | 7.0-9.9 | ≥10.0 |

Recovery requirements per shift type:
- 12h day → 11h rest
- 12h night → 24h rest
- 24h / 24h inv → 48h rest

Evidence database (hardcoded):
- Hours: ACGME, Lockley et al. NEJM 2004
- Nights: BMJ, Vetter et al. JAMA 2016
- Consecutive: Dawson & Reid, Nature 1997
- 24h: Williamson & Feyer, Occup Environ Med 2000

**Step 4: Run → PASS**

**Step 5: Commit**

```bash
git add backend/src/shifts/flow-score.engine.ts backend/src/shifts/__tests__/flow-score.engine.spec.ts
git commit -m "feat: FlowScore FRMS engine — workload windows, recovery debt, evidence"
```

---

## Task 4: Refactor RiskEngine → FlowScore

**Files:**
- Modify: `backend/src/risk-engine/risk.engine.ts`
- Modify: `backend/src/risk-engine/risk-engine.service.ts`
- Modify: `backend/src/risk-engine/__tests__/risk-engine.service.spec.ts`

Replace `RiskLevel` with `FlowScoreLevel` throughout. Use `calculateFlowScore()` for final level. Add insights + evidence to response. Update service to persist `FlowScore` enum. Fix tests.

```bash
git commit -m "refactor: RiskEngine delegates to FlowScore FRMS"
```

---

## Task 5: Update Optimization Engine

Replace risk level references with FlowScore. Fix tests.

```bash
git commit -m "refactor: optimization engine uses FlowScore levels"
```

---

## Task 6: Update Users Service

Save `energyCost24hInvertido` and `maxNightShifts` in onboarding + work-profile PATCH.

```bash
git commit -m "feat: users service supports new WorkProfile fields"
```

---

## Task 7: Full Backend Test Suite

```bash
cd backend && npx jest --no-coverage
```

Fix ALL remaining RiskLevel → FlowScore breakages.

```bash
git commit -m "fix: all backend tests pass with FlowScore FRMS"
```

---

## Task 8: Update Frontend Types

Replace `RiskLevel` with `FlowScore`. Add `WorkloadMetrics`, `RecoveryDebt`, `Evidence` types. Add new WorkProfile fields.

```bash
git commit -m "refactor: frontend types — FlowScore FRMS"
```

---

## Task 9: Create FlowBadge Component

4-level badge: green/yellow/orange/red. Keep risk-badge.tsx as re-export.

```bash
git commit -m "feat: FlowBadge component with 4-level FRMS colors"
```

---

## Task 10: Update i18n Translations

PT-BR + EN for FlowScore levels, insights, evidence, page titles.

```bash
git commit -m "feat: FlowScore FRMS translations (PT-BR + EN)"
```

---

## Task 11: Update Dashboard

FlowBadge, 3-window workload summary, recovery debt indicator, insights section.

```bash
git commit -m "feat: dashboard shows FlowScore with recovery debt + insights"
```

---

## Task 12: Update Simulate Page

FlowBadge, 4-level verdict, insights, scientific evidence display.

```bash
git commit -m "feat: simulate shows FlowScore + scientific evidence"
```

---

## Task 13: Update Risk History → Flow Score History

Rename page, 4-level chart, FlowBadge.

```bash
git commit -m "feat: Flow Score History page with 4-level chart"
```

---

## Task 14: Update Settings + Onboarding

24h invertido energy slider, updated defaults (1.0/1.4/2.2/2.4), maxNightShifts input.

```bash
git commit -m "feat: settings + onboarding — 24h invertido + maxNightShifts"
```

---

## Task 15: Update Smart Planner

FlowBadge replaces risk level badges.

```bash
git commit -m "feat: smart planner uses FlowScore badges"
```

---

## Task 16: Full Test Suite + Smoke Test

Backend tests, frontend TypeScript, frontend tests, visual smoke test, E2E tests.

```bash
git commit -m "feat: FlowScore FRMS complete — all tests passing"
```
