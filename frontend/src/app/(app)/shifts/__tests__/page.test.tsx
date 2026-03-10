import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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

import ShiftsPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockShifts = [
  {
    id: '1',
    date: '2025-01-15T08:00:00Z',
    endDate: '2025-01-15T20:00:00Z',
    type: 'TWELVE_HOURS',
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
    type: 'TWELVE_HOURS',
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
    type: 'TWENTY_FOUR_HOURS',
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

  it('renders shifts list', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText('Meus Plantões')).toBeInTheDocument();
    const shiftCards = screen.getAllByTestId('shift-card');
    expect(shiftCards.length).toBe(3);
  });

  it('shows confirmed and simulated counts', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText(/2 confirmados/)).toBeInTheDocument();
    expect(screen.getByText(/1 simulados/)).toBeInTheDocument();
  });

  it('shows "Novo plantão" button', () => {
    mockUseQuery.mockReturnValue({ data: mockShifts, isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText('Novo plantão')).toBeInTheDocument();
  });

  it('shows empty state when no shifts', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<ShiftsPage />);
    expect(screen.getByText('Você ainda não tem plantões cadastrados.')).toBeInTheDocument();
    expect(screen.getByText('Adicionar primeiro plantão')).toBeInTheDocument();
  });
});
