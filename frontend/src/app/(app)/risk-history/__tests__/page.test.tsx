import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/lib/format', () => ({
  formatDate: (d: string) => `formatted-${d}`,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/risk-badge', () => ({
  RiskBadge: ({ level }: any) => <span data-testid="risk-badge">{level}</span>,
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

import RiskHistoryPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockHistory = [
  {
    id: '1',
    riskLevel: 'SAFE',
    riskScore: 25,
    hoursIn5Days: 24,
    hoursInWeek: 36,
    consecutiveNights: 0,
    recommendation: 'Continue assim, sua carga está equilibrada.',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    riskLevel: 'MODERATE',
    riskScore: 55,
    hoursIn5Days: 48,
    hoursInWeek: 56,
    consecutiveNights: 1,
    recommendation: 'Atenção à carga.',
    createdAt: '2025-01-10T10:00:00Z',
  },
];

describe('RiskHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });
    render(<RiskHistoryPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders risk history page heading', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    expect(screen.getByText('Historico de Risco')).toBeInTheDocument();
  });

  it('renders page description', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    expect(
      screen.getByText('Acompanhe como sua carga de trabalho evoluiu ao longo do tempo.')
    ).toBeInTheDocument();
  });

  it('renders risk history records', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    const badges = screen.getAllByTestId('risk-badge');
    expect(badges.length).toBe(2);
    expect(badges[0]).toHaveTextContent('SAFE');
    expect(badges[1]).toHaveTextContent('MODERATE');
  });

  it('shows risk scores', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    expect(screen.getByText('Score: 25/100')).toBeInTheDocument();
    expect(screen.getByText('Score: 55/100')).toBeInTheDocument();
  });

  it('shows workload details', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    expect(screen.getByText('36h / semana')).toBeInTheDocument();
    expect(screen.getByText('0 noturno(s) seguido(s)')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<RiskHistoryPage />);
    expect(
      screen.getByText('Nenhum registro ainda. O historico e gerado automaticamente.')
    ).toBeInTheDocument();
  });

  it('shows recommendations', () => {
    mockUseQuery.mockReturnValue({ data: mockHistory, isLoading: false });
    render(<RiskHistoryPage />);
    expect(screen.getByText(/Continue assim, sua carga está equilibrada\./)).toBeInTheDocument();
  });
});
