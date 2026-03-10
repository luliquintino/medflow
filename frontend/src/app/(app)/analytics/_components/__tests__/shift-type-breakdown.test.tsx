import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('lucide-react', () => ({
  Sun: () => <span data-testid="icon-sun" />,
  Moon: () => <span data-testid="icon-moon" />,
  Clock: () => <span data-testid="icon-clock" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

import { ShiftTypeBreakdown } from '../shift-type-breakdown';
import type { ShiftTypeIncome } from '@/types';

const sampleData: ShiftTypeIncome[] = [
  { type: 'TWELVE_HOURS', typeLabel: '12 horas', totalRevenue: 10000, shiftCount: 8, totalHours: 96, avgPerShift: 1250, avgPerHour: 104 },
  { type: 'TWENTY_FOUR_HOURS', typeLabel: '24 horas', totalRevenue: 12000, shiftCount: 5, totalHours: 120, avgPerShift: 2400, avgPerHour: 100 },
  { type: 'NIGHT', typeLabel: 'Noturno', totalRevenue: 3000, shiftCount: 2, totalHours: 24, avgPerShift: 1500, avgPerHour: 125 },
];

describe('ShiftTypeBreakdown', () => {
  it('returns null when data is empty', () => {
    const { container } = render(<ShiftTypeBreakdown data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders shift type labels', () => {
    render(<ShiftTypeBreakdown data={sampleData} />);
    expect(screen.getByText('12 horas')).toBeInTheDocument();
    expect(screen.getByText('24 horas')).toBeInTheDocument();
    expect(screen.getByText('Noturno')).toBeInTheDocument();
  });

  it('renders "Receita por Tipo de Plantão" title', () => {
    render(<ShiftTypeBreakdown data={sampleData} />);
    expect(screen.getByText('Receita por Tipo de Plantão')).toBeInTheDocument();
  });

  it('shows formatted revenue for each shift type', () => {
    render(<ShiftTypeBreakdown data={sampleData} />);
    expect(screen.getByText('R$ 10000')).toBeInTheDocument();
    expect(screen.getByText('R$ 12000')).toBeInTheDocument();
    expect(screen.getByText('R$ 3000')).toBeInTheDocument();
  });
});
