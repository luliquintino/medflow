import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { GrowthTrendChart } from '../growth-trend-chart';
import type { MonthGrowth } from '@/types';

const sampleData: MonthGrowth[] = [
  { label: 'Jan', growthPercent: 5 },
  { label: 'Fev', growthPercent: -2 },
  { label: 'Mar', growthPercent: 8 },
];

describe('GrowthTrendChart', () => {
  it('returns null when data is empty', () => {
    const { container } = render(<GrowthTrendChart data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders card with "Crescimento Mensal (%)" title', () => {
    render(<GrowthTrendChart data={sampleData} />);
    expect(screen.getByText('Crescimento Mensal (%)')).toBeInTheDocument();
  });
});
