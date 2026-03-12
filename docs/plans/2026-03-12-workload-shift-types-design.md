# Workload Periods + Shift Types Redesign

## Context
The dashboard workload section shows "Hours in 5 days" and "Weekly hours" but the labels don't match what users expect. Shift types are limited to 3 options but medical shifts have 4 common types.

## Changes

### 1. Workload Periods
Replace "Hours in 5 days (60h)" and "Weekly hours (72h)" with:
- **Horas na semana** (Monday–Sunday, limit 60h)
- **Horas no mês** (calendar month, display only)

Backend: adjust `weekStart` to Monday. Frontend: swap the 2 top metric cards. Risk engine: update rules to use weekly hours.

### 2. Shift Types
Replace `TWELVE_HOURS | TWENTY_FOUR_HOURS | NIGHT` with:

| Enum | Label | Hours | Night? |
|------|-------|-------|--------|
| TWELVE_DAY | 12h Diurno | 12 | No |
| TWELVE_NIGHT | 12h Noturno | 12 | Yes |
| TWENTY_FOUR | 24h | 24 | No |
| TWENTY_FOUR_INVERTED | 24h Invertido | 24 | Yes |

Prisma migration to rename enum values + migrate existing data.

## Files to Modify
- `backend/src/shifts/shifts.engine.ts` — week calculation (Monday start), remove 5-day metric
- `backend/src/risk-engine/risk.engine.ts` — update risk rules
- `backend/src/risk-engine/risk-engine.service.ts` — update snapshot fields
- `backend/prisma/schema.prisma` — ShiftType enum
- `backend/prisma/migrations/` — new migration
- `frontend/src/types/index.ts` — ShiftType, labels, hours maps
- `frontend/src/app/(app)/dashboard/page.tsx` — workload cards
- `frontend/src/components/shifts/shift-form-modal.tsx` — 4 type buttons
- `frontend/src/components/shifts/shift-card.tsx` — type labels
- `frontend/messages/en.json` + `pt-BR.json` — i18n updates
