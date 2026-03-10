import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('lucide-react', () => ({
  DollarSign: () => <span data-testid="icon-dollar-sign" />,
  Clock: () => <span data-testid="icon-clock" />,
  Building2: () => <span data-testid="icon-building" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { AnalyticsKPIs } from '../analytics-kpis';
import type { AnalyticsSummary } from '@/types';

const baseSummary: AnalyticsSummary = {
  totalRevenue: 25000,
  totalShifts: 20,
  totalHours: 240,
  avgPerShift: 1250,
  avgPerHour: 104,
  bestHospital: 'Hospital Albert Einstein',
  overallGrowthPercent: 12,
};

describe('AnalyticsKPIs', () => {
  it('renders 4 KPI cards with labels', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('Média por Plantão')).toBeInTheDocument();
    expect(screen.getByText('Melhor Hospital')).toBeInTheDocument();
    expect(screen.getByText('Tendência')).toBeInTheDocument();
  });

  it('shows formatted currency for total revenue', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('R$ 25000')).toBeInTheDocument();
  });

  it('shows formatted currency for avgPerShift', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('R$ 1250')).toBeInTheDocument();
  });

  it('shows bestHospital name', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('Hospital Albert Einstein')).toBeInTheDocument();
  });

  it('shows dash when bestHospital is null', () => {
    const summary: AnalyticsSummary = { ...baseSummary, bestHospital: null };
    render(<AnalyticsKPIs summary={summary} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "+" prefix for positive growth', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('shows no "+" prefix for negative growth', () => {
    const summary: AnalyticsSummary = { ...baseSummary, overallGrowthPercent: -5 };
    render(<AnalyticsKPIs summary={summary} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('shows dash when overallGrowthPercent is null', () => {
    const summary: AnalyticsSummary = { ...baseSummary, overallGrowthPercent: null };
    render(<AnalyticsKPIs summary={summary} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows shift count in sub text', () => {
    render(<AnalyticsKPIs summary={baseSummary} />);
    expect(screen.getByText('20 plantões')).toBeInTheDocument();
  });
});
