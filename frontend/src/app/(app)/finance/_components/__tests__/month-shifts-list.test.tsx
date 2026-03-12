import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/shifts/shift-card', () => ({
  ShiftCard: ({ shift }: any) => <div data-testid="shift-card">{shift.hospital}</div>,
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
}));

import { MonthShiftsList } from '../month-shifts-list';
import type { Shift, MonthContext } from '@/types';

const mockMonthContext: MonthContext = {
  month: 3,
  year: 2026,
  isPast: false,
  isCurrent: true,
  isFuture: false,
};

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: '1',
    date: '2026-03-10',
    hospital: 'Hospital A',
    type: 'TWELVE_DAY',
    period: 'DAY',
    status: 'CONFIRMED',
    value: 1500,
    realized: true,
    userId: 'u1',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01',
    ...overrides,
  } as Shift;
}

describe('MonthShiftsList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Plantões do mês" header', () => {
    const shifts = [makeShift()];
    render(
      <MonthShiftsList
        shifts={shifts}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText('Plantões do mês')).toBeInTheDocument();
  });

  it('renders shift cards when shifts are provided', () => {
    const shifts = [
      makeShift({ id: '1', hospital: { id: 'h1', name: 'Hospital A' } as any }),
      makeShift({ id: '2', hospital: { id: 'h2', name: 'Hospital B' } as any }),
    ];
    render(
      <MonthShiftsList
        shifts={shifts}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText('Hospital A')).toBeInTheDocument();
    expect(screen.getByText('Hospital B')).toBeInTheDocument();
  });

  it('shows empty message when no shifts exist', () => {
    render(
      <MonthShiftsList
        shifts={[]}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText('Nenhum plantão neste mês.')).toBeInTheDocument();
  });

  it('renders add button for non-past months', () => {
    render(
      <MonthShiftsList
        shifts={[]}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText('Adicionar plantão')).toBeInTheDocument();
  });

  it('does not render add button for past months', () => {
    const pastContext: MonthContext = { month: 1, year: 2025, isPast: true, isCurrent: false, isFuture: false };
    render(
      <MonthShiftsList
        shifts={[]}
        monthContext={pastContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.queryByText('Adicionar plantão')).not.toBeInTheDocument();
  });

  it('shows confirmed count in summary', () => {
    const shifts = [
      makeShift({ id: '1', status: 'CONFIRMED', realized: true }),
      makeShift({ id: '2', status: 'CONFIRMED', realized: true }),
    ];
    render(
      <MonthShiftsList
        shifts={shifts}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText(/2 confirmados/)).toBeInTheDocument();
  });

  it('shows total revenue in summary', () => {
    const shifts = [
      makeShift({ id: '1', value: 1500, status: 'CONFIRMED', realized: true }),
      makeShift({ id: '2', value: 2000, status: 'CONFIRMED', realized: true }),
    ];
    render(
      <MonthShiftsList
        shifts={shifts}
        monthContext={mockMonthContext}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAdd={mockOnAdd}
      />
    );
    expect(screen.getByText('R$ 3500')).toBeInTheDocument();
  });
});
