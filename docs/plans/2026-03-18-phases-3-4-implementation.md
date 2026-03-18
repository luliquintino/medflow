# Phases 3 & 4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add compound income simulator, enhanced projections, hospital ROI scoring, self-benchmarking, and strategic insights to MedFlow.

**Architecture:** Pure-function engines for all calculations (no DB access). Services fetch from Prisma, pass to engines. New `/market-intelligence` page for Phase 4, expanded `/simulate` and `/finance` for Phase 3.

**Tech Stack:** NestJS + Prisma (backend), Next.js 14 + Tailwind + Recharts + next-intl (frontend), Jest (testing)

---

### Task 1: Compound Scenario Simulation Engine

**Files:**
- Create: `backend/src/finance/finance-scenario.engine.ts`
- Create: `backend/src/finance/__tests__/finance-scenario.engine.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/finance/__tests__/finance-scenario.engine.spec.ts
import { ScenarioEngine, ScenarioInput, ScenarioResult } from '../finance-scenario.engine';

describe('ScenarioEngine', () => {
  const baseInput: ScenarioInput = {
    existingShifts: [
      { date: '2026-03-05', value: 1500, hours: 12, type: 'TWELVE_DAY' },
      { date: '2026-03-10', value: 1500, hours: 12, type: 'TWELVE_DAY' },
    ],
    hypotheticalShifts: [
      { date: '2026-03-20', value: 1800, hours: 12, type: 'TWELVE_NIGHT' },
      { date: '2026-03-25', value: 2000, hours: 24, type: 'TWENTY_FOUR' },
    ],
    projectionMonths: 3,
    minimumMonthlyGoal: 10000,
    idealMonthlyGoal: 15000,
    averageShiftValue: 1600,
  };

  it('should return monthly breakdown with current + added revenue', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.monthlyBreakdown).toBeDefined();
    expect(result.monthlyBreakdown.length).toBeGreaterThanOrEqual(1);
    const march = result.monthlyBreakdown[0];
    expect(march.currentRevenue).toBe(3000); // 2 existing shifts
    expect(march.addedRevenue).toBe(3800);   // 1800 + 2000
    expect(march.totalRevenue).toBe(6800);
  });

  it('should calculate goal progress percentages', () => {
    const result = ScenarioEngine.calculate(baseInput);
    const march = result.monthlyBreakdown[0];
    expect(march.minimumGoalProgress).toBeCloseTo(68, 0); // 6800/10000
    expect(march.idealGoalProgress).toBeCloseTo(45.3, 0);  // 6800/15000
  });

  it('should project future months based on pace', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.monthlyBreakdown.length).toBe(3); // projectionMonths=3
    // Future months should have projected values
    expect(result.monthlyBreakdown[1].totalRevenue).toBeGreaterThan(0);
  });

  it('should return summary with totals', () => {
    const result = ScenarioEngine.calculate(baseInput);
    expect(result.summary.totalAddedRevenue).toBe(3800);
    expect(result.summary.avgMonthlyIncome).toBeGreaterThan(0);
  });

  it('should handle empty hypothetical shifts', () => {
    const input = { ...baseInput, hypotheticalShifts: [] };
    const result = ScenarioEngine.calculate(input);
    expect(result.monthlyBreakdown[0].addedRevenue).toBe(0);
  });

  it('should cap at 10 hypothetical shifts', () => {
    const manyShifts = Array(15).fill({ date: '2026-03-20', value: 1000, hours: 12, type: 'TWELVE_DAY' });
    const input = { ...baseInput, hypotheticalShifts: manyShifts };
    const result = ScenarioEngine.calculate(input);
    // Should only use first 10
    expect(result.summary.totalAddedRevenue).toBe(10000);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --testPathPattern="finance-scenario.engine" --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the engine implementation**

```typescript
// backend/src/finance/finance-scenario.engine.ts
export interface ScenarioShift {
  date: string;
  value: number;
  hours: number;
  type: string;
}

export interface ScenarioInput {
  existingShifts: ScenarioShift[];
  hypotheticalShifts: ScenarioShift[];
  projectionMonths: 1 | 3 | 6;
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  averageShiftValue: number;
}

export interface MonthBreakdown {
  month: string;        // "Mar/26"
  year: number;
  monthIndex: number;   // 0-11
  currentRevenue: number;
  addedRevenue: number;
  totalRevenue: number;
  shiftsCount: number;
  hoursWorked: number;
  minimumGoalProgress: number;  // 0-100
  idealGoalProgress: number;    // 0-100
  minimumGoalGap: number;
  idealGoalGap: number;
  suggestedExtraShifts: number;
}

export interface ScenarioSummary {
  totalAddedRevenue: number;
  avgMonthlyIncome: number;
  monthsToMinGoal: number | null;  // null = already met every month
  monthsToIdealGoal: number | null;
}

export interface ScenarioResult {
  monthlyBreakdown: MonthBreakdown[];
  summary: ScenarioSummary;
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MAX_HYPOTHETICAL = 10;

export class ScenarioEngine {
  static calculate(input: ScenarioInput): ScenarioResult {
    const now = new Date();
    const hypo = input.hypotheticalShifts.slice(0, MAX_HYPOTHETICAL);
    const { projectionMonths, minimumMonthlyGoal, idealMonthlyGoal, averageShiftValue } = input;

    // Group existing shifts by month
    const existingByMonth = this.groupByMonth(input.existingShifts);
    const hypoByMonth = this.groupByMonth(hypo);

    // Calculate current month pace for projections
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const currentExisting = existingByMonth.get(currentMonthKey);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(1, now.getDate());
    const monthlyPace = currentExisting
      ? (currentExisting.revenue / daysPassed) * daysInMonth
      : averageShiftValue * 4; // fallback: ~4 shifts

    const monthlyBreakdown: MonthBreakdown[] = [];
    let totalAdded = 0;
    let totalIncome = 0;

    for (let i = 0; i < projectionMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const yr = d.getFullYear().toString().slice(-2);
      const label = `${MONTH_NAMES[d.getMonth()]}/${yr}`;

      const existing = existingByMonth.get(key) || { revenue: 0, shifts: 0, hours: 0 };
      const added = hypoByMonth.get(key) || { revenue: 0, shifts: 0, hours: 0 };

      // For current month: use actual data. Future months: use pace projection
      const currentRev = i === 0 ? existing.revenue : monthlyPace;
      const addedRev = added.revenue;
      const totalRev = currentRev + addedRev;
      const totalShifts = (i === 0 ? existing.shifts : Math.round(monthlyPace / (averageShiftValue || 1))) + added.shifts;
      const totalHours = (i === 0 ? existing.hours : 0) + added.hours;

      totalAdded += addedRev;
      totalIncome += totalRev;

      const minProgress = minimumMonthlyGoal > 0 ? Math.min(100, (totalRev / minimumMonthlyGoal) * 100) : 100;
      const idealProgress = idealMonthlyGoal > 0 ? Math.min(100, (totalRev / idealMonthlyGoal) * 100) : 100;
      const idealGap = Math.max(0, idealMonthlyGoal - totalRev);
      const minGap = Math.max(0, minimumMonthlyGoal - totalRev);

      monthlyBreakdown.push({
        month: label,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        currentRevenue: Math.round(currentRev * 100) / 100,
        addedRevenue: Math.round(addedRev * 100) / 100,
        totalRevenue: Math.round(totalRev * 100) / 100,
        shiftsCount: totalShifts,
        hoursWorked: totalHours,
        minimumGoalProgress: Math.round(minProgress * 10) / 10,
        idealGoalProgress: Math.round(idealProgress * 10) / 10,
        minimumGoalGap: Math.round(minGap * 100) / 100,
        idealGoalGap: Math.round(idealGap * 100) / 100,
        suggestedExtraShifts: averageShiftValue > 0 ? Math.ceil(idealGap / averageShiftValue) : 0,
      });
    }

    // Summary
    const avgMonthly = projectionMonths > 0 ? totalIncome / projectionMonths : 0;
    const monthsToMin = monthlyBreakdown.findIndex(m => m.minimumGoalProgress >= 100);
    const monthsToIdeal = monthlyBreakdown.findIndex(m => m.idealGoalProgress >= 100);

    return {
      monthlyBreakdown,
      summary: {
        totalAddedRevenue: Math.round(totalAdded * 100) / 100,
        avgMonthlyIncome: Math.round(avgMonthly * 100) / 100,
        monthsToMinGoal: monthsToMin >= 0 ? monthsToMin + 1 : null,
        monthsToIdealGoal: monthsToIdeal >= 0 ? monthsToIdeal + 1 : null,
      },
    };
  }

  private static groupByMonth(shifts: ScenarioShift[]): Map<string, { revenue: number; shifts: number; hours: number }> {
    const map = new Map<string, { revenue: number; shifts: number; hours: number }>();
    for (const s of shifts) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = map.get(key) || { revenue: 0, shifts: 0, hours: 0 };
      entry.revenue += s.value;
      entry.shifts++;
      entry.hours += s.hours;
      map.set(key, entry);
    }
    return map;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --testPathPattern="finance-scenario.engine" --no-coverage`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add backend/src/finance/finance-scenario.engine.ts backend/src/finance/__tests__/finance-scenario.engine.spec.ts
git commit -m "feat: compound scenario simulation engine with tests"
```

---

### Task 2: Scenario Simulation API Endpoint

**Files:**
- Create: `backend/src/finance/dto/simulate-scenario.dto.ts`
- Modify: `backend/src/finance/finance.service.ts` — add `simulateScenario()` method
- Modify: `backend/src/finance/finance.controller.ts` — add `POST /finance/simulate-scenario`

**Step 1: Create the DTO**

```typescript
// backend/src/finance/dto/simulate-scenario.dto.ts
import { IsArray, IsEnum, IsNumber, IsString, Min, Max, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ScenarioShiftDto {
  @ApiProperty() @IsString() date: string;
  @ApiProperty() @IsEnum(['TWELVE_DAY', 'TWELVE_NIGHT', 'TWENTY_FOUR', 'TWENTY_FOUR_INVERTED']) type: string;
  @ApiProperty() @IsNumber() @Min(0) value: number;
  @ApiProperty({ required: false }) hospitalId?: string;
}

export class SimulateScenarioDto {
  @ApiProperty({ type: [ScenarioShiftDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScenarioShiftDto)
  shifts: ScenarioShiftDto[];

  @ApiProperty({ enum: [1, 3, 6] })
  @IsEnum([1, 3, 6])
  projectionMonths: 1 | 3 | 6;
}
```

**Step 2: Add service method**

Add to `finance.service.ts` a new `simulateScenario(userId, dto)` method that:
1. Fetches financial profile and current month shifts (reuse existing queries)
2. Maps existing shifts to `ScenarioShift[]` format
3. Maps DTO shifts to `ScenarioShift[]` with correct hours from SHIFT_TYPE_HOURS
4. Calls `ScenarioEngine.calculate()` and returns result

**Step 3: Add controller endpoint**

Add `@Post('simulate-scenario')` to `finance.controller.ts` that calls `financeService.simulateScenario()`.

**Step 4: Run existing tests to verify nothing is broken**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --testPathPattern="finance" --no-coverage`
Expected: All existing + new tests PASS

**Step 5: Commit**

```bash
git add backend/src/finance/dto/simulate-scenario.dto.ts backend/src/finance/finance.service.ts backend/src/finance/finance.controller.ts
git commit -m "feat: POST /finance/simulate-scenario endpoint"
```

---

### Task 3: Enhanced Projections in Finance Engine

**Files:**
- Modify: `backend/src/finance/finance.engine.ts` — add `calculateEnhancedProjections()`
- Modify: `backend/src/finance/__tests__/finance.engine.spec.ts` — add tests

**Step 1: Write failing tests**

Tests for `calculateEnhancedProjections()` that verifies:
- Returns `minimumGoalGap` and `idealGoalGap` per projected month
- Returns `suggestedExtraShifts` per month
- Returns `trend` ("growing" | "stable" | "declining") based on 6-month history
- Returns `bestMonth` and `worstMonth`

**Step 2: Implement `calculateEnhancedProjections()`**

New static method on `FinanceEngine` that takes existing `MonthProjection[]` + historical monthly revenues + goals → returns enhanced projections with gaps, trend, and suggestions.

**Step 3: Update `finance.service.ts` `getSummary()`** to include enhanced projections in response.

**Step 4: Run tests**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --testPathPattern="finance.engine" --no-coverage`

**Step 5: Commit**

```bash
git commit -m "feat: enhanced projections with goal gaps, trends, and suggestions"
```

---

### Task 4: Hospital ROI Engine

**Files:**
- Create: `backend/src/analytics/hospital-roi.engine.ts`
- Create: `backend/src/analytics/__tests__/hospital-roi.engine.spec.ts`

**Step 1: Write failing tests**

Tests for `HospitalRoiEngine.calculate()`:
- Calculates `revenuePerHour` correctly per hospital
- Calculates `reliabilityScore` (paymentConsistency via stddev, shiftFrequency, recency)
- Calculates composite `hospitalScore` (50% value/hour + 25% volume + 25% reliability)
- Assigns tiers: top 33% = "ouro", middle = "prata", bottom = "bronze"
- Generates 1-line insight per hospital
- Handles single hospital (no stddev comparison)
- Handles zero shifts (empty result)

**Step 2: Implement the engine**

Pure function: receives shifts + hospitals + now → returns `HospitalRoi[]` sorted by score.

Score normalization: Each sub-score normalized 0-100 relative to the user's own hospitals (best = 100, worst = 0, interpolated).

**Step 3: Run tests**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --testPathPattern="hospital-roi" --no-coverage`

**Step 4: Commit**

```bash
git commit -m "feat: hospital ROI engine with composite scoring and tiers"
```

---

### Task 5: Benchmarking Engine

**Files:**
- Create: `backend/src/analytics/benchmarking.engine.ts`
- Create: `backend/src/analytics/__tests__/benchmarking.engine.spec.ts`

**Step 1: Write failing tests**

Tests for `BenchmarkingEngine.calculate()`:
- Calculates period snapshots (currentMonth, previousMonth, 3mo avg, 6mo avg)
- Calculates deltas (vsLastMonth, vsThreeMonthAvg) as percentages
- Compares vs goals (gap, progress%, onTrack boolean)
- Determines trends ("rising"/"stable"/"falling") using linear regression or simple comparison
- Handles insufficient data (< 2 months)

**Step 2: Implement the engine**

Pure function: receives monthly data array + financial goals → returns `BenchmarkingResult`.

Trend logic: Compare last 3 months average vs previous 3 months. >10% up = "rising", >10% down = "falling", else "stable".

**Step 3: Run tests, commit**

```bash
git commit -m "feat: benchmarking engine with self-comparison and goal tracking"
```

---

### Task 6: Strategic Insights Engine

**Files:**
- Create: `backend/src/analytics/insights.engine.ts`
- Create: `backend/src/analytics/__tests__/insights.engine.spec.ts`

**Step 1: Write failing tests**

Test each insight rule:
1. Hospital below avg value/hour → "opportunity" insight
2. Monthly goal at risk → "warning" insight with suggested extra shifts
3. Revenue concentration >70% in 1 hospital → "warning" insight
4. Consistent improvement (3 months rising) → "achievement" insight
5. Rising hours without revenue → "strategy" insight
6. FlowScore risk + financial → "strategy" insight

**Step 2: Implement rules engine**

Pure function: receives `HospitalRoi[]`, `BenchmarkingResult`, `FlowScoreLevel` → returns `StrategicInsight[]` sorted by priority.

Each insight: `{ type, priority, title, description, metric? }`.

**Step 3: Run tests, commit**

```bash
git commit -m "feat: strategic insights engine with 6 rule types"
```

---

### Task 7: Analytics API Endpoints (ROI + Benchmarking + Insights)

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts` — add 3 new methods
- Modify: `backend/src/analytics/analytics.controller.ts` — add 3 new endpoints

**Step 1: Add service methods**

- `getHospitalRoi(userId, monthsBack)` — fetches shifts + hospitals, calls `HospitalRoiEngine`
- `getBenchmarking(userId)` — fetches 6-month shifts + financial profile, calls `BenchmarkingEngine`
- `getInsights(userId)` — calls ROI + Benchmarking engines, passes results to `InsightsEngine`

**Step 2: Add controller endpoints**

- `GET /analytics/hospital-roi` → `getHospitalRoi()`
- `GET /analytics/benchmarking` → `getBenchmarking()`
- `GET /analytics/insights` → `getInsights()`

All with `@UseGuards(JwtAuthGuard)`.

**Step 3: Run tests**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --no-coverage`
Expected: All tests pass

**Step 4: Commit**

```bash
git commit -m "feat: analytics API — hospital ROI, benchmarking, and insights endpoints"
```

---

### Task 8: Frontend Types + i18n

**Files:**
- Modify: `frontend/src/types/index.ts` — add new interfaces
- Modify: `frontend/messages/pt-BR.json` — add marketIntelligence + enhanced simulate sections
- Modify: `frontend/messages/en.json` — same

**Step 1: Add TypeScript interfaces**

```typescript
// Add to frontend/src/types/index.ts

// ─── Scenario Simulation ─────────────────────────────────────────────────────
export interface MonthBreakdown {
  month: string;
  year: number;
  monthIndex: number;
  currentRevenue: number;
  addedRevenue: number;
  totalRevenue: number;
  shiftsCount: number;
  hoursWorked: number;
  minimumGoalProgress: number;
  idealGoalProgress: number;
  minimumGoalGap: number;
  idealGoalGap: number;
  suggestedExtraShifts: number;
}

export interface ScenarioResult {
  monthlyBreakdown: MonthBreakdown[];
  summary: {
    totalAddedRevenue: number;
    avgMonthlyIncome: number;
    monthsToMinGoal: number | null;
    monthsToIdealGoal: number | null;
  };
}

// ─── Hospital ROI ────────────────────────────────────────────────────────────
export interface HospitalRoi {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  totalHours: number;
  revenuePerHour: number;
  avgShiftValue: number;
  shiftCount: number;
  reliabilityScore: number;
  hospitalScore: number;
  hospitalTier: "ouro" | "prata" | "bronze";
  insight: string;
}

// ─── Benchmarking ────────────────────────────────────────────────────────────
export interface PeriodSnapshot {
  revenue: number;
  hours: number;
  shiftsCount: number;
  revenuePerHour: number;
}

export type Trend = "rising" | "stable" | "falling";

export interface BenchmarkingData {
  currentMonth: PeriodSnapshot;
  previousMonth: PeriodSnapshot;
  threeMonthAvg: PeriodSnapshot;
  sixMonthAvg: PeriodSnapshot;
  vsLastMonth: { revenue: number; hours: number; revenuePerHour: number };
  vsThreeMonthAvg: { revenue: number; hours: number; revenuePerHour: number };
  vsMinimumGoal: { gap: number; progress: number; onTrack: boolean };
  vsIdealGoal: { gap: number; progress: number; onTrack: boolean };
  trends: { revenuePerHour: Trend; workload: Trend; goalAttainment: Trend };
}

// ─── Strategic Insights ──────────────────────────────────────────────────────
export interface StrategicInsight {
  type: "opportunity" | "warning" | "achievement" | "strategy";
  priority: number;
  title: string;
  description: string;
  metric?: { value: number; unit: string; trend: Trend };
}
```

**Step 2: Add i18n translations**

Add `marketIntelligence` section to both pt-BR.json and en.json with labels for:
- Page title/subtitle
- Hospital ROI section (score, tier labels, value/hour, reliability, insight)
- Benchmarking section (vs last month, vs 3-month avg, goal progress, trend labels)
- Insights section (type labels, see more)
- Enhanced simulate (add shift, remove, horizon, scenario results)

**Step 3: Commit**

```bash
git commit -m "feat: frontend types + i18n for phases 3 & 4"
```

---

### Task 9: Enhanced Simulate Page (Compound Scenarios)

**Files:**
- Modify: `frontend/src/app/(app)/simulate/page.tsx` — rewrite for compound scenarios

**Step 1: Implement the enhanced simulate page**

The page should have two modes:
- **Quick simulate** (existing) — single shift, same as today
- **Scenario builder** (new) — tabbed or toggled

Scenario builder:
1. List of hypothetical shifts (each with type, date, value). Add/remove buttons.
2. Horizon selector: 1 / 3 / 6 months (pill buttons)
3. Submit → calls `POST /finance/simulate-scenario`
4. Results: Recharts stacked bar chart (currentRevenue green + addedRevenue blue per month)
5. Goal lines (minimum dashed, ideal solid)
6. Summary cards: total added, avg monthly, months to goal

**Step 2: Test manually** — verify form adds/removes shifts, API call works, chart renders.

**Step 3: Commit**

```bash
git commit -m "feat: compound scenario simulator with multi-shift + projection chart"
```

---

### Task 10: Enhanced Projections on Finance Page

**Files:**
- Modify: `frontend/src/app/(app)/finance/_components/projection-chart.tsx` — enhance with goal lines + gaps

**Step 1: Enhance ProjectionChart component**

- Bar chart with `ReferenceLine` for minimum (dashed) and ideal (solid) goals
- Each bar shows projected revenue with color: green if meets ideal, amber if meets minimum, red if below minimum
- Tooltip: "Projetado: R$X | Meta ideal: R$Y | Gap: R$Z | +N plantões fecham"
- Trend badge above chart: ↑ Crescendo / → Estável / ↓ Caindo

**Step 2: Update Finance page** to pass enhanced projection data to the chart.

**Step 3: Commit**

```bash
git commit -m "feat: enhanced projection chart with goal lines and trend indicator"
```

---

### Task 11: Market Intelligence Page — Hospital ROI Section

**Files:**
- Create: `frontend/src/app/(app)/market-intelligence/page.tsx`
- Create: `frontend/src/app/(app)/market-intelligence/_components/hospital-roi-section.tsx`

**Step 1: Create the page**

Page layout with 3 collapsible sections. Start with Hospital ROI:

- Fetches `GET /analytics/hospital-roi`
- Cards per hospital with:
  - Tier badge (🥇/🥈/🥉 or colored badge "Ouro"/"Prata"/"Bronze")
  - Score (0-100) as circular progress
  - Key metrics: R$/hora, plantões, confiabilidade
  - Expandable: detailed breakdown
  - 1-line insight
- Sort dropdown: by score, by R$/hora, by volume

**Step 2: Commit**

```bash
git commit -m "feat: market intelligence page with hospital ROI section"
```

---

### Task 12: Market Intelligence — Benchmarking Section

**Files:**
- Create: `frontend/src/app/(app)/market-intelligence/_components/benchmarking-section.tsx`

**Step 1: Implement benchmarking section**

- Fetches `GET /analytics/benchmarking`
- KPI cards with delta arrows: "R$/hora: R$125 ↑12% vs mês anterior"
- Sparklines (small inline line charts) for 6-month trends using Recharts `<Sparklines>`
- Goal progress bars: "75% da meta ideal" with trend color
- Colors: green = improving, amber = stable, red = declining

**Step 2: Commit**

```bash
git commit -m "feat: benchmarking section with KPI deltas and sparklines"
```

---

### Task 13: Market Intelligence — Strategic Insights Section

**Files:**
- Create: `frontend/src/app/(app)/market-intelligence/_components/insights-section.tsx`

**Step 1: Implement insights section**

- Fetches `GET /analytics/insights`
- Cards per insight with icon by type:
  - 💡 opportunity (blue-ish)
  - ⚠️ warning (amber)
  - 🏆 achievement (green)
  - 🎯 strategy (purple-ish)
- Title + description + optional metric badge
- Max 5 visible, "Ver mais" button to expand
- Ordered by priority

**Step 2: Commit**

```bash
git commit -m "feat: strategic insights section with prioritized cards"
```

---

### Task 14: Sidebar Navigation Update

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx` — add Market Intelligence link
- Modify: `frontend/messages/pt-BR.json` — add nav key
- Modify: `frontend/messages/en.json` — add nav key

**Step 1: Add navigation entry**

Add to `NAV_KEYS` array after analytics:
```typescript
{ href: "/market-intelligence", icon: TrendingUp, key: "marketIntelligence" },
```

Import `TrendingUp` from lucide-react.

Add to nav i18n: `"marketIntelligence": "Inteligência de Mercado"` (pt-BR) / `"Market Intelligence"` (en).

**Step 2: Verify sidebar renders correctly**

**Step 3: Commit**

```bash
git commit -m "feat: add Market Intelligence to sidebar navigation"
```

---

### Task 15: Integration Test + Final Verification

**Files:**
- Run all backend tests
- Run all frontend tests
- Manual E2E verification

**Step 1: Run all backend tests**

Run: `cd /Users/luizaquintino/Desktop/Medflow/backend && npx jest --no-coverage`
Expected: All tests pass (existing + new engine tests)

**Step 2: Run all frontend tests**

Run: `cd /Users/luizaquintino/Desktop/Medflow/frontend && npx jest --no-coverage`
Expected: All tests pass

**Step 3: Fix any failures**

If tests fail, fix them before proceeding.

**Step 4: Final commit**

```bash
git commit -m "test: all tests passing for phases 3 & 4"
```

---

## Task Dependency Graph

```
Task 1 (Scenario Engine) → Task 2 (Scenario API) → Task 9 (Simulate Page)
Task 3 (Enhanced Projections) → Task 10 (Finance Chart)
Task 4 (ROI Engine) ─┐
Task 5 (Bench Engine) ├→ Task 6 (Insights Engine) → Task 7 (Analytics API) → Task 11/12/13 (MI Page)
Task 4 ───────────────┘
Task 8 (Types + i18n) → Task 9, 10, 11, 12, 13
Task 14 (Sidebar) — independent
Task 15 (Integration) — after all
```

**Parallelizable groups:**
- Group A: Tasks 1, 4, 5 (independent engines)
- Group B: Tasks 2, 3, 6 (depend on Group A)
- Group C: Task 8 (types, can run parallel with backend)
- Group D: Tasks 9, 10, 11, 12, 13, 14 (frontend, after Group B + C)
- Group E: Task 7 (API endpoints, after Group B)
- Final: Task 15
