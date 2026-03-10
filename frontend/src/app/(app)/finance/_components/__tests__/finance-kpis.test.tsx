import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, padding }: any) => <div className={className} data-padding={padding}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { FinanceKPIs } from '../finance-kpis';
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
    projections: { threeMonths: [], sixMonths: [] },
    profile: { id: '1', savingsGoal: 2000, averageShiftValue: 1500, minimumMonthlyGoal: 8000, idealMonthlyGoal: 15000 },
    ...overrides,
  };
}

describe('FinanceKPIs', () => {
  it('renders current month KPI labels', () => {
    render(<FinanceKPIs finance={makeFinance()} />);
    expect(screen.getByText('Receita atual')).toBeInTheDocument();
    expect(screen.getByText('Meta mínima')).toBeInTheDocument();
    expect(screen.getByText('Meta ideal')).toBeInTheDocument();
    expect(screen.getByText('Falta para ideal')).toBeInTheDocument();
  });

  it('formats currency values correctly for current month', () => {
    render(<FinanceKPIs finance={makeFinance({ currentRevenue: 5000, minimumMonthlyGoal: 8000, idealMonthlyGoal: 15000, revenueToIdeal: 10000 })} />);
    expect(screen.getByText('R$ 5000')).toBeInTheDocument();
    expect(screen.getByText('R$ 8000')).toBeInTheDocument();
    expect(screen.getByText('R$ 15000')).toBeInTheDocument();
    expect(screen.getByText('R$ 10000')).toBeInTheDocument();
  });

  it('renders future month KPI labels when isFuture is true', () => {
    const finance = makeFinance({
      monthContext: { month: 5, year: 2026, isPast: false, isCurrent: false, isFuture: true },
      confirmedRevenue: 3000,
      simulatedRevenue: 2000,
    });
    render(<FinanceKPIs finance={finance} />);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Simulado')).toBeInTheDocument();
    expect(screen.getByText('Meta mínima')).toBeInTheDocument();
    expect(screen.getByText('Falta para ideal')).toBeInTheDocument();
  });

  it('formats currency values correctly for future month', () => {
    const finance = makeFinance({
      monthContext: { month: 5, year: 2026, isPast: false, isCurrent: false, isFuture: true },
      confirmedRevenue: 3000,
      simulatedRevenue: 2000,
      minimumMonthlyGoal: 8000,
      revenueToIdeal: 10000,
    });
    render(<FinanceKPIs finance={finance} />);
    expect(screen.getByText('R$ 3000')).toBeInTheDocument();
    expect(screen.getByText('R$ 2000')).toBeInTheDocument();
  });

  it('renders exactly 4 KPI cards', () => {
    const { container } = render(<FinanceKPIs finance={makeFinance()} />);
    const labels = container.querySelectorAll('p.text-xs');
    expect(labels).toHaveLength(4);
  });
});
