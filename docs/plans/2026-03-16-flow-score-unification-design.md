# Flow Score — Fatigue Risk Management System Design

**Date:** 2026-03-16 (v2 — expanded with Recovery Debt + scientific basis)
**Branch:** feature/dev-staging
**Status:** Approved

## Vision

Transform Med Flow into a **Fatigue Risk Management System (FRMS)** for doctors — inspired by aviation FRMS (ICAO), occupational medicine, and sports performance science.

The system quantifies fatigue risk and explains the evidence. It never says "you can't work" — it says "this pattern increases fatigue risk."

## Three Pillars

### 1. Workload (Carga de Trabalho)
How much the doctor has worked across 3 time windows:
- **7 days** — acute fatigue
- **14 days** — accumulated fatigue
- **28 days** — chronic fatigue / burnout trajectory

### 2. Recovery Debt (Dívida de Recuperação)
How much recovery the body needs vs. how much it got.
Based on rest gaps between shifts, quality of rest (night vs day), and consecutive work days.

### 3. Flow Score (Risco de Fadiga)
Final classification combining workload + recovery debt into 4 levels.

---

## Flow Score Levels

| Level | Enum | Color | Meaning |
|-------|------|-------|---------|
| Sustentável | `PILAR_SUSTENTAVEL` | 🟢 Green | Workload within sustainable limits |
| Carga Elevada | `PILAR_CARGA_ELEVADA` | 🟡 Yellow | Approaching limits, plan recovery |
| Risco de Fadiga | `PILAR_RISCO_FADIGA` | 🟠 Orange | Fatigue risk is elevated |
| Alto Risco | `PILAR_ALTO_RISCO` | 🔴 Red | Dangerous pattern, action needed |

**Prisma enum:**
```prisma
enum FlowScore {
  PILAR_SUSTENTAVEL
  PILAR_CARGA_ELEVADA
  PILAR_RISCO_FADIGA
  PILAR_ALTO_RISCO
}
```

---

## Fatigue Weights

```
TWELVE_DAY           = 1.0  (12h day shift)
TWELVE_NIGHT         = 1.4  (12h night — circadian disruption)
TWENTY_FOUR          = 2.2  (24h — cognitive decline after 16h)
TWENTY_FOUR_INVERTED = 2.4  (24h night entry — worst case)
```

---

## Workload Metrics (3 Windows)

```typescript
interface WorkloadMetrics {
  // Acute (7 days)
  hours7d: number;
  nightShifts7d: number;
  longShifts7d: number;       // 24h or 24h_inv
  consecutiveShifts: number;  // current streak
  fatigueScore7d: number;     // sum of weights

  // Accumulated (14 days)
  hours14d: number;
  fatigueScore14d: number;

  // Chronic (28 days)
  hours28d: number;
  fatigueScore28d: number;
  avgWeeklyHours28d: number;  // hours28d / 4
}
```

---

## Recovery Debt Calculation

```typescript
interface RecoveryDebt {
  hoursSinceLastShift: number | null;
  restQuality: 'GOOD' | 'PARTIAL' | 'POOR';  // based on time of rest
  recoveryDebtHours: number;    // how many hours of rest still needed
  isRecovered: boolean;         // recoveryDebtHours <= 0
}
```

**Rules:**
- After a 12h day shift: needs ≥11h rest (EU Working Time Directive)
- After a 12h night shift: needs ≥24h rest (circadian recovery)
- After a 24h shift: needs ≥48h rest (cognitive recovery — Lockley et al.)
- After 24h inverted: needs ≥48h rest

Recovery Debt = required rest − actual rest since last shift.

---

## Flow Score Classification Rules

Uses **worst-of** logic across all dimensions:

| Dimension | Sustentável | Carga Elevada | Risco de Fadiga | Alto Risco |
|-----------|-------------|---------------|-----------------|------------|
| Hours/7d | ≤48h | 49-60h | 61-72h | >72h |
| Hours/14d | ≤96h | 97-120h | 121-144h | >144h |
| Avg weekly/28d | ≤48h | 49-55h | 56-65h | >65h |
| Night shifts/7d | ≤1 | 2 | 3 | ≥4 |
| Long shifts/7d | ≤1 | 2 | 3 | ≥4 |
| Consecutive shifts | ≤2 | 3 | 4-5 | ≥6 |
| Recovery debt | 0h (recovered) | 1-6h | 7-12h | >12h |
| Fatigue score/7d | <4.0 | 4.0-6.9 | 7.0-9.9 | ≥10.0 |

**Logic:** Take the worst level across ALL dimensions = final Flow Score.

---

## Scientific Evidence Messages

Each risk factor can reference real evidence:

### Hours
> "Médicos trabalhando mais de 60h semanais apresentam maior risco de fadiga e erros médicos."
> — ACGME Duty Hour Studies; Lockley et al., NEJM 2004

### Night shifts
> "Trabalho noturno frequente está associado a distúrbios de sono e maior risco cardiovascular."
> — BMJ Occupational Health; Vetter et al., JAMA 2016

### Consecutive shifts
> "Sequências prolongadas de trabalho sem descanso adequado reduzem performance cognitiva e aumentam risco de acidentes."
> — Dawson & Reid, Nature 1997

### 24h shifts
> "Após 24h sem sono, a performance cognitiva equivale a um nível de álcool no sangue de 0.10%."
> — Williamson & Feyer, Occup Environ Med 2000

---

## Output Format

All APIs return:

```json
{
  "workload": {
    "hours7d": 48,
    "hours14d": 84,
    "hours28d": 168,
    "avgWeeklyHours28d": 42,
    "nightShifts7d": 1,
    "longShifts7d": 1,
    "consecutiveShifts": 2,
    "fatigueScore7d": 5.6,
    "fatigueScore14d": 10.2,
    "fatigueScore28d": 18.4
  },
  "recovery": {
    "hoursSinceLastShift": 36,
    "restQuality": "PARTIAL",
    "recoveryDebtHours": 12,
    "isRecovered": false
  },
  "flowScore": "PILAR_CARGA_ELEVADA",
  "insights": [
    "Carga semanal elevada: 48h. Dentro do limite, mas próximo.",
    "Dívida de recuperação: 12h. Considere descansar antes do próximo plantão."
  ],
  "evidence": [
    {
      "factor": "hours",
      "citation": "ACGME Duty Hour Studies",
      "summary": "Médicos com >60h/semana têm maior risco de erros."
    }
  ]
}
```

---

## Golden Rule

**Never say:** "Você não pode trabalhar"
**Always say:** "Esse padrão aumenta o risco de fadiga"

---

## UX Behavior

### On shift simulation:
```
Adicionar plantão: 24h (Noturno)
Horas na semana: 72h
Plantões consecutivos: 4
Dívida de recuperação: 18h

Flow Score: Risco de Fadiga

"Essa sequência aumenta significativamente a carga de trabalho da semana.
 Planeje recuperação adequada após esses plantões."

📚 Estudos mostram que após 24h sem sono, a performance cognitiva
   equivale a BAC de 0.10%. (Williamson & Feyer, 2000)
```

---

## Files Modified

### Backend
- `prisma/schema.prisma` — FlowScore enum, WorkProfile new fields, RiskHistory migration
- `src/shifts/flow-score.engine.ts` — NEW: Pure FlowScore calculation
- `src/shifts/shifts.engine.ts` — Updated fatigue weights + EnergyCosts
- `src/risk-engine/risk.engine.ts` — Returns FlowScore, adds insights + evidence
- `src/risk-engine/risk-engine.service.ts` — Uses FlowScore
- `src/dashboard/dashboard.service.ts` — Returns FlowScore
- `src/optimization/optimization.engine.ts` — Uses FlowScore
- `src/users/users.service.ts` — New WorkProfile fields

### Frontend
- `src/types/index.ts` — FlowScore type replaces RiskLevel
- `src/components/ui/flow-badge.tsx` — NEW: 4-level badge component
- `src/app/(app)/dashboard/page.tsx` — FlowScore badge + insights
- `src/app/(app)/simulate/page.tsx` — FlowScore + evidence display
- `src/app/(app)/smart-planner/page.tsx` — FlowScore badges
- `src/app/(app)/risk-history/page.tsx` — Renamed, 4-level chart
- `src/app/(app)/risk-history/_components/risk-distribution-chart.tsx` — 4 levels
- `src/app/(app)/settings/page.tsx` — 24h invertido slider + new defaults
- `src/app/onboarding/page.tsx` — maxNightShifts field
- `messages/pt-BR.json` — FlowScore translations + evidence texts
- `messages/en.json` — Same in English
