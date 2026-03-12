import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShiftCard } from '../shift-card';
import type { Shift } from '@/types';

jest.mock('lucide-react', () => ({
  Pencil: (props: any) => <svg data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <svg data-testid="trash-icon" {...props} />,
  MapPin: (props: any) => <svg data-testid="map-icon" {...props} />,
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
  DollarSign: (props: any) => <svg data-testid="dollar-icon" {...props} />,
  Building2: (props: any) => <svg data-testid="building-icon" {...props} />,
  CheckCircle2: (props: any) => <svg data-testid="check-icon" {...props} />,
  XCircle: (props: any) => <svg data-testid="xcircle-icon" {...props} />,
}));

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
}));

const createShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-1',
  date: '2026-03-01T08:00:00Z',
  endDate: '2026-03-01T20:00:00Z',
  type: 'TWELVE_DAY',
  hours: 12,
  value: 1500,
  location: 'Hospital Santa Casa',
  status: 'CONFIRMED',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ShiftCard', () => {
  it('should render shift date', () => {
    render(<ShiftCard shift={createShift()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render shift type label', () => {
    render(<ShiftCard shift={createShift()} />);
    expect(screen.getByText('12 horas')).toBeInTheDocument();
  });

  it('should render 24h type label', () => {
    render(<ShiftCard shift={createShift({ type: 'TWENTY_FOUR', hours: 24 })} />);
    expect(screen.getByText('24h')).toBeInTheDocument();
  });

  it('should render night type label', () => {
    render(<ShiftCard shift={createShift({ type: 'TWELVE_NIGHT' })} />);
    expect(screen.getByText('12h Noturno')).toBeInTheDocument();
  });

  it('should render location', () => {
    render(<ShiftCard shift={createShift()} />);
    expect(screen.getByText('Hospital Santa Casa')).toBeInTheDocument();
  });

  it('should render hospital name when hospital is present', () => {
    const shift = createShift({ hospital: { id: 'h1', name: 'Hospital São Paulo' } });
    render(<ShiftCard shift={shift} />);
    expect(screen.getByText('Hospital São Paulo')).toBeInTheDocument();
  });

  it('should render hours', () => {
    render(<ShiftCard shift={createShift()} />);
    expect(screen.getByText('12h')).toBeInTheDocument();
  });

  it('should hide hours in compact mode', () => {
    render(<ShiftCard shift={createShift()} compact />);
    expect(screen.queryByText('12h')).not.toBeInTheDocument();
  });

  it('should render formatted value', () => {
    render(<ShiftCard shift={createShift()} />);
    expect(screen.getByText('R$ 1500.00')).toBeInTheDocument();
  });

  it('should show "Simulado" badge for simulated shifts', () => {
    render(<ShiftCard shift={createShift({ status: 'SIMULATED' })} />);
    expect(screen.getByText('Simulado')).toBeInTheDocument();
  });

  it('should NOT show "Simulado" badge for confirmed shifts', () => {
    render(<ShiftCard shift={createShift({ status: 'CONFIRMED' })} />);
    expect(screen.queryByText('Simulado')).not.toBeInTheDocument();
  });

  it('should show "Realizado" badge when realized is true', () => {
    render(<ShiftCard shift={createShift({ realized: true })} />);
    expect(screen.getByText('Realizado')).toBeInTheDocument();
  });

  it('should NOT show "Realizado" badge when realized is null', () => {
    render(<ShiftCard shift={createShift({ realized: null })} />);
    expect(screen.queryByText('Realizado')).not.toBeInTheDocument();
  });

  it('should show "Não realizado" badge when realized is false', () => {
    render(<ShiftCard shift={createShift({ realized: false })} />);
    expect(screen.getByText('Não realizado')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ShiftCard shift={createShift()} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId('pencil-icon').closest('button')!);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<ShiftCard shift={createShift()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId('trash-icon').closest('button')!);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  describe('Realization banner', () => {
    const pastDate = '2025-01-01T08:00:00Z';

    it('should show "Aconteceu?" banner for past confirmed shifts with null realized', () => {
      const onRealize = jest.fn();
      render(
        <ShiftCard
          shift={createShift({ date: pastDate, status: 'CONFIRMED', realized: null })}
          onRealize={onRealize}
        />
      );
      expect(screen.getByText('Este plantão aconteceu?')).toBeInTheDocument();
      expect(screen.getByText('Sim')).toBeInTheDocument();
      expect(screen.getByText('Não')).toBeInTheDocument();
    });

    it('should NOT show banner for future confirmed shifts', () => {
      render(
        <ShiftCard
          shift={createShift({ date: '2099-12-01T08:00:00Z', status: 'CONFIRMED', realized: null })}
          onRealize={jest.fn()}
        />
      );
      expect(screen.queryByText('Este plantão aconteceu?')).not.toBeInTheDocument();
    });

    it('should NOT show banner for simulated shifts', () => {
      render(
        <ShiftCard
          shift={createShift({ date: pastDate, status: 'SIMULATED', realized: null })}
          onRealize={jest.fn()}
        />
      );
      expect(screen.queryByText('Este plantão aconteceu?')).not.toBeInTheDocument();
    });

    it('should NOT show banner when already realized', () => {
      render(
        <ShiftCard
          shift={createShift({ date: pastDate, status: 'CONFIRMED', realized: true })}
          onRealize={jest.fn()}
        />
      );
      expect(screen.queryByText('Este plantão aconteceu?')).not.toBeInTheDocument();
    });

    it('should call onRealize(id, true) when "Sim" is clicked', () => {
      const onRealize = jest.fn();
      render(
        <ShiftCard
          shift={createShift({ id: 'shift-99', date: pastDate, status: 'CONFIRMED', realized: null })}
          onRealize={onRealize}
        />
      );
      fireEvent.click(screen.getByText('Sim'));
      expect(onRealize).toHaveBeenCalledWith('shift-99', true);
    });

    it('should call onRealize(id, false) when "Não" is clicked', () => {
      const onRealize = jest.fn();
      render(
        <ShiftCard
          shift={createShift({ id: 'shift-99', date: pastDate, status: 'CONFIRMED', realized: null })}
          onRealize={onRealize}
        />
      );
      fireEvent.click(screen.getByText('Não'));
      expect(onRealize).toHaveBeenCalledWith('shift-99', false);
    });

    it('should NOT show banner if onRealize is not provided', () => {
      render(
        <ShiftCard
          shift={createShift({ date: pastDate, status: 'CONFIRMED', realized: null })}
        />
      );
      expect(screen.queryByText('Este plantão aconteceu?')).not.toBeInTheDocument();
    });
  });
});
