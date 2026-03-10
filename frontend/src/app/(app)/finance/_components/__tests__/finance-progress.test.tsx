import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress-bar', () => ({
  ProgressBar: ({ label, value }: any) => <div data-testid="progress-bar">{label}: {value}%</div>,
}));

import { FinanceProgress } from '../finance-progress';
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

describe('FinanceProgress', () => {
  it('renders the card title', () => {
    render(<FinanceProgress finance={makeFinance()} />);
    expect(screen.getByText('Progresso do mês')).toBeInTheDocument();
  });

  it('renders minimum goal progress bar', () => {
    render(<FinanceProgress finance={makeFinance({ progressToMinimum: 62 })} />);
    expect(screen.getByText('Meta mínima: 62%')).toBeInTheDocument();
  });

  it('renders ideal goal progress bar', () => {
    render(<FinanceProgress finance={makeFinance({ progressToIdeal: 33 })} />);
    expect(screen.getByText('Meta ideal: 33%')).toBeInTheDocument();
  });

  it('renders both progress bars', () => {
    render(<FinanceProgress finance={makeFinance()} />);
    const bars = screen.getAllByTestId('progress-bar');
    expect(bars).toHaveLength(2);
  });

  it('shows confirmed shifts count', () => {
    render(<FinanceProgress finance={makeFinance({ confirmedShiftsCount: 5 })} />);
    expect(screen.getByText(/5 plantão\(ões\)/)).toBeInTheDocument();
  });

  it('shows simulated shifts count when present', () => {
    render(<FinanceProgress finance={makeFinance({ simulatedShiftsCount: 2 })} />);
    expect(screen.getByText(/\+ 2 simulado\(s\)/)).toBeInTheDocument();
  });

  it('shows unrealized shifts count when present', () => {
    render(<FinanceProgress finance={makeFinance({ unrealizedShiftsCount: 1 })} />);
    expect(screen.getByText(/1 não realizado\(s\)/)).toBeInTheDocument();
  });

  it('does not show simulated text when count is zero', () => {
    render(<FinanceProgress finance={makeFinance({ simulatedShiftsCount: 0 })} />);
    expect(screen.queryByText(/simulado/)).not.toBeInTheDocument();
  });
});
