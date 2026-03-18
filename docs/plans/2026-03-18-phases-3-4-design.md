# Phases 3 & 4 — Career Planning + Market Intelligence

**Date:** 2026-03-18
**Branch:** `feature/phases-3-4`
**Status:** Approved

---

## Overview

Expand MedFlow with career planning tools (Phase 3) and market intelligence (Phase 4). Phase 3 enhances existing Finance and Simulate pages. Phase 4 adds a new Market Intelligence dashboard.

## Decisions

- **Benchmarking:** Self-comparison (past performance + personal goals). No external/peer data needed.
- **Simulator:** Compound scenarios (multiple shifts + 1/3/6 month projection).
- **ROI:** Composite score (50% value/hour, 25% volume, 25% reliability) with gold/silver/bronze tiers.
- **Navigation:** Phase 3 expands existing pages. Phase 4 gets a new `/market-intelligence` page.

---

## Phase 3: Career Planning

### 3A — Advanced Income Simulator

**Backend:** `POST /finance/simulate-scenario`

Input:
- `shifts[]` — array of 1-10 hypothetical shifts (date, type, value, hospitalId)
- `projectionMonths` — 1 | 3 | 6

Output:
- `monthlyBreakdown[]` — per month: currentRevenue, addedRevenue, totalRevenue, goal progress %, shiftsCount, hoursWorked
- `summary` — totalAddedRevenue, avgMonthlyIncome, monthsToMinGoal, monthsToIdealGoal, flowScoreImpact per month

Implementation: New method in `finance.service.ts`, reuses `FinanceEngine` + `FlowScoreEngine`. No new module.

**Frontend:** Expand `/simulate` page
- Step 1: Add shifts to scenario (+ button, editable list)
- Step 2: Choose horizon (1, 3, 6 months)
- Step 3: Results — stacked bar chart (current + added revenue), progress bars for goals, FlowScore per month with subtle alerts

Backward compatible — existing `POST /finance/simulate` unchanged.

### 3B — Enhanced Monthly Projections

**Backend:** Expand `GET /finance/summary` response

Add to existing projections:
- `minimumGoalGap` / `idealGoalGap` per month
- `suggestedExtraShifts` per month (how many shifts close the gap)
- `trend`: "growing" | "stable" | "declining"
- `bestMonth` / `worstMonth` (last 6 months)

Implementation: New `calculateEnhancedProjections()` in `FinanceEngine`.

**Frontend:** Expand `ProjectionChart` on Finance page
- Bar chart with goal lines (minimum dashed, ideal solid)
- Gap in R$ per month
- Trend indicator (arrow up/stable/down)
- Tooltip: "Faltam X plantões de ~R$Y para meta ideal"

---

## Phase 4: Market Intelligence

### 4A — Hospital ROI with Composite Score

**Backend:** `GET /analytics/hospital-roi`

Output per hospital:
- Financial: totalRevenue, totalHours, revenuePerHour, avgShiftValue, shiftCount
- Reliability score (0-100): paymentConsistency (stddev), shiftFrequency, recency
- Composite score (0-100): 50% value/hour + 25% volume + 25% reliability
- Tier: "ouro" | "prata" | "bronze"
- Insight: 1-line text explanation

Implementation: New `analytics.hospital-roi.engine.ts` — pure function, no DB access.

### 4B — Benchmarking (Self + Goals)

**Backend:** `GET /analytics/benchmarking`

Output:
- Period snapshots: currentMonth, previousMonth, threeMonthAvg, sixMonthAvg (revenue, hours, shiftsCount, revenuePerHour, flowScore)
- Deltas (%): vsLastMonth, vsThreeMonthAvg
- Goal comparison: vsMinimumGoal, vsIdealGoal (gap, progress%, onTrack)
- Trends (6 months): revenuePerHour, workload, goalAttainment — each "rising" | "stable" | "falling"

Implementation: New `analytics.benchmarking.engine.ts` — pure function.

### 4C — Strategic Value Insights

**Backend:** `GET /analytics/insights`

Output: Array of insights, each with type (opportunity/warning/achievement/strategy), priority (1-5), title, description, optional metric.

Rules engine generates insights from cross-referencing data:
- Hospital below personal avg value/hour
- Monthly goal at risk + suggested extra shifts
- Excessive concentration in 1 hospital
- Consistent improvement recognition
- Rising hours without proportional revenue
- FlowScore risk + financial optimization advice

Implementation: New `analytics.insights.engine.ts` — pure function, receives metrics from other engines.

### 4D — Market Intelligence Page

**Frontend:** New page `/market-intelligence`

Three sections:
1. **Hospital ROI** — Cards with tier badge (gold/silver/bronze), score, value/hour. Expandable details. Sortable by score/value/volume.
2. **Benchmarking** — Comparative KPIs with arrows (↑12% vs last month). Mini sparklines for 6 months. Progress bars for goals with trend indicators.
3. **Strategic Insights** — Cards by type with icons. Ordered by priority. Max 5 visible, expandable.

---

## Navigation

```
Dashboard
Plantões
Financeiro          ← enhanced projections (3B)
Simulador           ← compound scenarios (3A)
Inteligência de Mercado  ← NEW (4A + 4B + 4C)
Smart Planner
Histórico de Risco
Hospitais
Configurações
```

Sidebar icon for Market Intelligence: TrendingUp or BarChart3.

## i18n

New section `marketIntelligence` in `pt-BR.json` and `en.json` covering all labels for ROI, benchmarking, and insights.

## Architecture Principles

- All calculation engines are pure functions (no side effects, no DB access)
- Services fetch data from Prisma, pass to engines, return results
- No new Prisma models needed — all data derived from existing Shift, Hospital, FinancialProfile
- All new endpoints require JWT auth
- Frontend uses existing API client pattern with React Query
