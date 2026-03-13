import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
}));

jest.mock('date-fns', () => ({
  format: jest.fn((d: Date, fmt: string) => {
    if (fmt === 'yyyy-MM-dd') return '2026-03-15';
    return '2026-03-15';
  }),
}));

jest.mock('@/lib/calendar', () => ({
  getMonthRange: jest.fn(() => ({ from: '2026-03-01', to: '2026-03-31' })),
  groupShiftsByDay: jest.fn(() => new Map()),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, icon, ...props }: any) => (
    <button onClick={onClick} {...props}>{icon}{children}</button>
  ),
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

jest.mock('@/components/shifts/shift-card', () => ({
  ShiftCard: ({ shift }: any) => (
    <div data-testid="shift-card">{shift.location} - {shift.status}</div>
  ),
}));

jest.mock('@/components/shifts/shift-form-modal', () => ({
  ShiftFormModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="shift-form-modal">Form Modal</div> : null
  ),
}));

jest.mock('@/components/shifts/calendar/shift-calendar', () => ({
  ShiftCalendar: ({ shifts }: any) => (
    <div data-testid="shift-calendar">Calendar ({shifts.length} shifts)</div>
  ),
}));

jest.mock('@/components/shifts/calendar/calendar-day-panel', () => ({
  CalendarDayPanel: () => <div data-testid="day-panel">Day Panel</div>,
}));

jest.mock('@/components/shifts/view-toggle', () => ({
  ViewToggle: ({ view, onChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onChange('list')} data-testid="toggle-list">Lista</button>
      <button onClick={() => onChange('calendar')} data-testid="toggle-calendar">Calendário</button>
    </div>
  ),
}));

import ShiftsPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockShifts = [
  {
    id: '1',
    date: '2025-01-15T08:00:00Z',
    endDate: '2025-01-15T20:00:00Z',
    type: 'TWELVE_DAY',
    hours: 12,
    value: 1500,
    location: 'Hospital A',
    status: 'CONFIRMED',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    date: '2025-01-20T08:00:00Z',
    endDate: '2025-01-20T20:00:00Z',
    type: 'TWELVE_DAY',
    hours: 12,
    value: 1200,
    location: 'Hospital B',
    status: 'SIMULATED',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '3',
    date: '2025-01-22T08:00:00Z',
    endDate: '2025-01-22T20:00:00Z',
    type: 'TWENTY_FOUR',
    hours: 24,
    value: 2500,
    location: 'Hospital C',
    status: 'CONFIRMED',
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('ShiftsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });
    render(<ShiftsPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders calendar view by default', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByTestId('shift-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  it('renders header with title and summary', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText('Meus Plantões')).toBeInTheDocument();
  });

  it('switches to list view when toggle clicked', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    fireEvent.click(screen.getByTestId('toggle-list'));
    const shiftCards = screen.getAllByTestId('shift-card');
    expect(shiftCards.length).toBe(3);
  });

  it('shows "Novo plantão" button', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText('Novo plantão')).toBeInTheDocument();
  });

  it('shows empty state when no shifts in list view', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<ShiftsPage />);
    // Switch to list view to see empty state
    fireEvent.click(screen.getByTestId('toggle-list'));
    expect(screen.getByText('Você ainda não tem plantões cadastrados.')).toBeInTheDocument();
    expect(screen.getByText('Adicionar primeiro plantão')).toBeInTheDocument();
  });
});
