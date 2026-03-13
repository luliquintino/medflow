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
  formatPercent: (v: number) => `${v}%`,
}));

const mockUser = {
  name: 'Luiza Quintino',
  email: 'luiza@test.com',
  gender: 'FEMALE' as const,
};

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    setUser: jest.fn(),
    setTokens: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Clock: () => <span data-testid="icon-clock" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Zap: () => <span data-testid="icon-zap" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  Battery: () => <span data-testid="icon-battery" />,
  Watch: () => <span data-testid="icon-watch" />,
  Activity: () => <span data-testid="icon-activity" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
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

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import DashboardPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const dashboardData = {
  finance: {
    currentRevenue: 5000,
    idealMonthlyGoal: 10000,
    progressToMinimum: 60,
    progressToIdeal: 50,
    revenueToMinimum: 2000,
    minimumShiftsRequired: 4,
    projections: {
      threeMonths: [
        { label: 'Jan', projectedRevenue: 8000 },
        { label: 'Fev', projectedRevenue: 9000 },
        { label: 'Mar', projectedRevenue: 10000 },
      ],
    },
    profile: {
      averageShiftValue: 1250,
    },
  },
  workload: {
    shiftsThisMonth: 8,
    totalHoursThisMonth: 96,
    totalHoursThisWeek: 24,
    hoursInLast5Days: 36,
    consecutiveNightShifts: 1,
    consecutiveShifts: 2,
    nextRestDayRecommended: false,
    totalExhaustionScore: 5.5,
    sustainabilityIndex: 900,
  },
  risk: {
    level: 'SAFE',
    score: 30,
    recommendation: 'Continue assim!',
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<DashboardPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('shows greeting for female user', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    // The mock does not process ICU select syntax; it only replaces {name} (first occurrence)
    // Raw: {gender, select, FEMALE {Olá, Dra. {name}} MALE {Olá, Dr. {name}} other {Olá, {name}}}
    // After replacing first {name} with "Luiza":
    expect(
      screen.getByText(/Olá, Dra\. Luiza/)
    ).toBeInTheDocument();
  });

  it('shows greeting for male user', () => {
    mockUser.name = 'João Silva';
    mockUser.gender = 'MALE' as any;
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(
      screen.getByText(/Olá, Dra\. João/)
    ).toBeInTheDocument();
    // Restore
    mockUser.name = 'Luiza Quintino';
    mockUser.gender = 'FEMALE' as any;
  });

  it('shows greeting for non-binary user', () => {
    mockUser.name = 'Maria Souza';
    mockUser.gender = 'NON_BINARY' as any;
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(
      screen.getByText(/Olá, Dra\. Maria/)
    ).toBeInTheDocument();
    // Restore
    mockUser.name = 'Luiza Quintino';
    mockUser.gender = 'FEMALE' as any;
  });

  it('shows SAFE message', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(
      screen.getByText('Seu mês está equilibrado. Você tem margem para mais plantões, se desejar.')
    ).toBeInTheDocument();
  });

  it('shows MODERATE message', () => {
    const moderateData = {
      ...dashboardData,
      risk: { ...dashboardData.risk, level: 'MODERATE' },
    };
    mockUseQuery.mockReturnValue({ data: moderateData, isLoading: false });
    render(<DashboardPage />);
    expect(
      screen.getByText('Atenção: sua carga de trabalho está moderada. Cuide-se.')
    ).toBeInTheDocument();
  });

  it('shows HIGH message', () => {
    const highData = {
      ...dashboardData,
      risk: { ...dashboardData.risk, level: 'HIGH' },
    };
    mockUseQuery.mockReturnValue({ data: highData, isLoading: false });
    render(<DashboardPage />);
    expect(
      screen.getByText('Alerta: sua carga está elevada. Considere avaliar seu bem-estar.')
    ).toBeInTheDocument();
  });

  it('renders KPI cards', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('Receita do mês')).toBeInTheDocument();
    expect(screen.getByText('Plantões confirmados')).toBeInTheDocument();
    expect(screen.getAllByText('Horas na semana').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nível de risco')).toBeInTheDocument();
  });

  it('renders financial revenue value', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('R$ 5000')).toBeInTheDocument();
  });

  it('renders CTA to simulate', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('Simular um plantão')).toBeInTheDocument();
  });

  it('renders meta financeira section', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('Meta financeira')).toBeInTheDocument();
  });

  it('renders carga de trabalho section', () => {
    mockUseQuery.mockReturnValue({ data: dashboardData, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByText('Carga de trabalho')).toBeInTheDocument();
  });
});
