import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { MonthlyIncomeChart } from '../monthly-income-chart';
import type { MonthlyIncome } from '@/types';

const sampleData: MonthlyIncome[] = [
  { label: 'Jan', year: 2026, month: 1, revenue: 8000, shiftCount: 6, totalHours: 72 },
  { label: 'Fev', year: 2026, month: 2, revenue: 10000, shiftCount: 8, totalHours: 96 },
  { label: 'Mar', year: 2026, month: 3, revenue: 7000, shiftCount: 5, totalHours: 60 },
];

describe('MonthlyIncomeChart', () => {
  it('returns null when data is empty', () => {
    const { container } = render(<MonthlyIncomeChart data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders card with "Receita Mensal" title', () => {
    render(<MonthlyIncomeChart data={sampleData} />);
    expect(screen.getByText('Receita Mensal')).toBeInTheDocument();
  });

  it('shows total shift count in footer', () => {
    render(<MonthlyIncomeChart data={sampleData} />);
    expect(screen.getByText('19 plantões no período')).toBeInTheDocument();
  });
});
