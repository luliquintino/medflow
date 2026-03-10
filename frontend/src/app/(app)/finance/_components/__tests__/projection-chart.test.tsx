import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: ({ children }: any) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  Cell: () => null,
}));

import { ProjectionChart } from '../projection-chart';
import type { FinanceSummary } from '@/types';

function makeFinance(overrides: Partial<FinanceSummary> = {}): FinanceSummary {
  return {
    minimumMonthlyGoal: 8000,
    idealMonthlyGoal: 15000,
    minimumShiftsRequired: 5,
    idealShiftsRequired: 10,
    currentRevenue: 5000,
    revenueToMinimum: 3000,
    revenueToIdeal: 10000,
    progressToMinimum: 62,
    progressToIdeal: 33,
    isMinimumReached: false,
    isIdealReached: false,
    confirmedShiftsCount: 3,
    simulatedShiftsCount: 0,
    unrealizedShiftsCount: 0,
    confirmedRevenue: 5000,
    simulatedRevenue: 0,
    unrealizedRevenue: 0,
    shifts: [],
    monthContext: { month: 3, year: 2026, isPast: false, isCurrent: true, isFuture: false },
    projections: {
      threeMonths: [
        { month: 3, label: 'Mar', projectedRevenue: 10000, projectedShifts: 7, goalMet: false },
        { month: 4, label: 'Abr', projectedRevenue: 12000, projectedShifts: 8, goalMet: false },
        { month: 5, label: 'Mai', projectedRevenue: 15000, projectedShifts: 10, goalMet: true },
      ],
      sixMonths: [
        { month: 3, label: 'Mar', projectedRevenue: 10000, projectedShifts: 7, goalMet: false },
        { month: 4, label: 'Abr', projectedRevenue: 12000, projectedShifts: 8, goalMet: false },
        { month: 5, label: 'Mai', projectedRevenue: 15000, projectedShifts: 10, goalMet: true },
        { month: 6, label: 'Jun', projectedRevenue: 16000, projectedShifts: 11, goalMet: true },
        { month: 7, label: 'Jul', projectedRevenue: 14000, projectedShifts: 9, goalMet: false },
        { month: 8, label: 'Ago', projectedRevenue: 17000, projectedShifts: 12, goalMet: true },
      ],
    },
    profile: { id: '1', savingsGoal: 2000, averageShiftValue: 1500, minimumMonthlyGoal: 8000, idealMonthlyGoal: 15000 },
    ...overrides,
  };
}

describe('ProjectionChart', () => {
  it('renders the chart card title', () => {
    render(<ProjectionChart finance={makeFinance()} />);
    expect(screen.getByText('Projeção 6 meses')).toBeInTheDocument();
  });

  it('renders the footer description text', () => {
    render(<ProjectionChart finance={makeFinance()} />);
    expect(screen.getByText('Baseado no ritmo atual de plantões do mês')).toBeInTheDocument();
  });

  it('renders chart container with projection data', () => {
    const { container } = render(<ProjectionChart finance={makeFinance()} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('returns null when sixMonths data is empty', () => {
    const finance = makeFinance({
      projections: { threeMonths: [], sixMonths: [] },
    });
    const { container } = render(<ProjectionChart finance={finance} />);
    expect(container.firstChild).toBeNull();
  });
});
