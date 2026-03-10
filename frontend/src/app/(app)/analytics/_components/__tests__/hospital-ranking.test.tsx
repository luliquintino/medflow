import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('lucide-react', () => ({
  Building2: () => <span data-testid="icon-building" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { HospitalRanking } from '../hospital-ranking';
import type { HospitalRank } from '@/types';

const sampleRanking: HospitalRank[] = [
  { hospitalId: '1', hospitalName: 'Hospital Albert Einstein', totalRevenue: 15000, avgPerShift: 1500, shiftCount: 10, totalHours: 120, revenueShare: 60 },
  { hospitalId: '2', hospitalName: 'Hospital Sírio-Libanês', totalRevenue: 8000, avgPerShift: 1333, shiftCount: 6, totalHours: 72, revenueShare: 32 },
  { hospitalId: '3', hospitalName: 'Hospital São Luiz', totalRevenue: 2000, avgPerShift: 1000, shiftCount: 2, totalHours: 24, revenueShare: 8 },
];

describe('HospitalRanking', () => {
  it('renders empty state when ranking is empty', () => {
    render(<HospitalRanking ranking={[]} />);
    expect(screen.getByText('Nenhum hospital com dados no período.')).toBeInTheDocument();
  });

  it('renders hospitals in order', () => {
    render(<HospitalRanking ranking={sampleRanking} />);
    expect(screen.getByText('Hospital Albert Einstein')).toBeInTheDocument();
    expect(screen.getByText('Hospital Sírio-Libanês')).toBeInTheDocument();
    expect(screen.getByText('Hospital São Luiz')).toBeInTheDocument();
  });

  it('renders position badges 1, 2, 3', () => {
    render(<HospitalRanking ranking={sampleRanking} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "Ranking de Hospitais" title', () => {
    render(<HospitalRanking ranking={sampleRanking} />);
    expect(screen.getByText('Ranking de Hospitais')).toBeInTheDocument();
  });

  it('shows formatted revenue for each hospital', () => {
    render(<HospitalRanking ranking={sampleRanking} />);
    expect(screen.getByText('R$ 15000')).toBeInTheDocument();
    expect(screen.getByText('R$ 8000')).toBeInTheDocument();
    expect(screen.getByText('R$ 2000')).toBeInTheDocument();
  });
});
