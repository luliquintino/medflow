import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { HospitalIncomeChart } from '../hospital-income-chart';
import type { HospitalRank } from '@/types';

const sampleRanking: HospitalRank[] = [
  { hospitalId: '1', hospitalName: 'Hospital A', totalRevenue: 15000, avgPerShift: 1500, shiftCount: 10, totalHours: 120, revenueShare: 60 },
  { hospitalId: '2', hospitalName: 'Hospital B', totalRevenue: 10000, avgPerShift: 1250, shiftCount: 8, totalHours: 96, revenueShare: 40 },
];

describe('HospitalIncomeChart', () => {
  it('returns null when ranking is empty', () => {
    const { container } = render(<HospitalIncomeChart ranking={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders card with "Receita por Hospital" title', () => {
    render(<HospitalIncomeChart ranking={sampleRanking} />);
    expect(screen.getByText('Receita por Hospital')).toBeInTheDocument();
  });
});
