import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, isSuccess: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('lucide-react', () => ({
  Brain: () => <span data-testid="icon-brain" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Clock: () => <span data-testid="icon-clock" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  Zap: () => <span data-testid="icon-zap" />,
  Check: () => <span data-testid="icon-check" />,
  Battery: () => <span data-testid="icon-battery" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, loading, icon, ...props }: any) => (
    <button onClick={onClick} disabled={loading} {...props}>{icon}{children}</button>
  ),
}));

jest.mock('@/components/ui/progress-bar', () => ({
  ProgressBar: ({ label, value }: any) => <div data-testid="progress-bar">{label}: {value}%</div>,
}));

jest.mock('@/components/ui/risk-badge', () => ({
  RiskBadge: ({ level }: any) => <span data-testid="risk-badge">{level}</span>,
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

import SmartPlannerPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockOptimizationResult = {
  financialGap: 4000,
  currentRevenue: 6000,
  targetRevenue: 10000,
  gapPercentage: 40,
  isGoalAlreadyMet: false,
  suggestedScenarios: [
    {
      description: 'Cenário equilibrado com 3 plantões',
      shifts: [
        {
          templateId: 't1',
          hospitalName: 'Hospital A',
          suggestedDate: '2025-01-20T08:00:00Z',
          durationInHours: 12,
          value: 1500,
          isNightShift: false,
        },
      ],
      totalShifts: 3,
      totalHours: 36,
      totalIncome: 4500,
      totalExhaustion: 3.5,
      sustainabilityIndex: 1285,
      riskLevel: 'SAFE' as const,
      optimizationScore: 85,
    },
    {
      description: 'Cenário intenso com 5 plantões',
      shifts: [],
      totalShifts: 5,
      totalHours: 60,
      totalIncome: 7500,
      totalExhaustion: 6.0,
      sustainabilityIndex: 1250,
      riskLevel: 'MODERATE' as const,
      optimizationScore: 60,
    },
  ],
};

describe('SmartPlannerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders planner page heading', () => {
    mockUseQuery.mockReturnValue({ data: mockOptimizationResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByText('Planejamento Inteligente')).toBeInTheDocument();
  });

  it('renders page description', () => {
    mockUseQuery.mockReturnValue({ data: mockOptimizationResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(
      screen.getByText('Sugestões otimizadas para atingir sua meta financeira')
    ).toBeInTheDocument();
  });

  it('shows optimization scenarios', () => {
    mockUseQuery.mockReturnValue({ data: mockOptimizationResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByText('Cenários sugeridos')).toBeInTheDocument();
    expect(screen.getByText('Cenário equilibrado com 3 plantões')).toBeInTheDocument();
    expect(screen.getByText('Cenário intenso com 5 plantões')).toBeInTheDocument();
  });

  it('shows financial status', () => {
    mockUseQuery.mockReturnValue({ data: mockOptimizationResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByText('Meta ideal mensal')).toBeInTheDocument();
    expect(screen.getByText('Receita atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 10000')).toBeInTheDocument();
    expect(screen.getByText('R$ 6000')).toBeInTheDocument();
  });

  it('shows financial gap message', () => {
    mockUseQuery.mockReturnValue({ data: mockOptimizationResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByText(/Faltam/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 4000/)).toBeInTheDocument();
  });

  it('shows error state when no data', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: new Error('fail') });
    render(<SmartPlannerPage />);
    expect(screen.getByText('Não foi possível gerar sugestões.')).toBeInTheDocument();
  });

  it('shows goal met message', () => {
    const goalMetResult = {
      ...mockOptimizationResult,
      isGoalAlreadyMet: true,
    };
    mockUseQuery.mockReturnValue({ data: goalMetResult, isLoading: false, error: null });
    render(<SmartPlannerPage />);
    expect(screen.getByText(/Parabéns! Você já atingiu sua meta ideal este mês./)).toBeInTheDocument();
  });
});
