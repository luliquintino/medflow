import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

// ─── Common Mocks ────────────────────────────────────────────────

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatPercent: (v: number) => `${v}%`,
  formatDate: (d: string) => `formatted-${d}`,
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: { name: 'Luiza', email: 'luiza@test.com', gender: 'FEMALE' },
    setUser: jest.fn(),
    setTokens: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
  })),
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

jest.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return false;
    return () => <span data-testid={`icon-${String(prop).toLowerCase()}`} />;
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

jest.mock('@/components/ui/progress-bar', () => ({
  ProgressBar: ({ label, value }: any) => <div data-testid="progress-bar">{label}: {value}%</div>,
}));

jest.mock('@/components/ui/flow-badge', () => ({
  FlowBadge: ({ level }: any) => <span data-testid="flow-badge">{level}</span>,
}));

jest.mock('@/components/ui/risk-badge', () => ({
  RiskBadge: ({ level }: any) => <span data-testid="risk-badge">{level}</span>,
}));

jest.mock('@/components/shifts/shift-card', () => ({
  ShiftCard: ({ shift }: any) => <div data-testid="shift-card">{shift.location}</div>,
}));

jest.mock('@/components/shifts/shift-form-modal', () => ({
  ShiftFormModal: ({ isOpen }: any) => isOpen ? <div data-testid="modal">Modal</div> : null,
}));

jest.mock('@/components/shifts/calendar/shift-calendar', () => ({
  ShiftCalendar: ({ shifts }: any) => <div data-testid="shift-calendar">Calendar ({shifts.length})</div>,
}));

jest.mock('@/components/shifts/calendar/calendar-day-panel', () => ({
  CalendarDayPanel: () => <div data-testid="day-panel">Day Panel</div>,
}));

jest.mock('@/components/shifts/view-toggle', () => ({
  ViewToggle: ({ view, onChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onChange('list')} data-testid="toggle-list">Lista</button>
      <button onClick={() => onChange('calendar')} data-testid="toggle-calendar">Cal</button>
    </div>
  ),
}));

jest.mock('@/lib/calendar', () => ({
  getMonthRange: jest.fn(() => ({ from: '2026-03-01', to: '2026-03-31' })),
  groupShiftsByDay: jest.fn(() => new Map()),
}));

jest.mock('@/lib/brazil-states', () => ({
  BRAZIL_STATES: [],
  fetchCitiesByUF: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ label, error, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input aria-label={label} {...props} />
      {error && <span>{error}</span>}
    </div>
  ),
}));

const mockUseQuery = useQuery as jest.Mock;

describe('Frontend Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard handles null/undefined data gracefully', () => {
    it('renders without crashing when data is null', async () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false });
      const DashboardPage = (await import('../app/(app)/dashboard/page')).default;
      render(<DashboardPage />);
      // Should render greeting at minimum
      // The i18n mock doesn't parse ICU select syntax, so the raw template with {name} partially replaced is rendered
      expect(screen.getByText(/Olá, Dra\. Luiza/)).toBeInTheDocument();
    });

    it('renders KPI placeholders when finance is null', async () => {
      mockUseQuery.mockReturnValue({
        data: { finance: null, workload: null, risk: null },
        isLoading: false,
      });
      const DashboardPage = (await import('../app/(app)/dashboard/page')).default;
      render(<DashboardPage />);
      // The dashes should appear when finance/workload/risk are null
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders no-data messages when finance and risk are null', async () => {
      mockUseQuery.mockReturnValue({
        data: { finance: null, workload: null, risk: null },
        isLoading: false,
      });
      const DashboardPage = (await import('../app/(app)/dashboard/page')).default;
      render(<DashboardPage />);
      expect(screen.getByText('Configure seus dados para acompanhar seu mês.')).toBeInTheDocument();
    });
  });

  describe('Shifts renders correctly', () => {
    it('renders calendar view by default with empty data', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      const ShiftsPage = (await import('../app/(app)/shifts/page')).default;
      render(<ShiftsPage />);
      expect(screen.getByTestId('shift-calendar')).toBeInTheDocument();
    });

    it('shows 0 confirmed and 0 simulated with empty array', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      const ShiftsPage = (await import('../app/(app)/shifts/page')).default;
      render(<ShiftsPage />);
      expect(screen.getByText(/0 confirmados/)).toBeInTheDocument();
    });
  });

  describe('Hospitals renders empty states correctly', () => {
    it('renders empty state with empty array', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      const HospitalsPage = (await import('../app/(app)/hospitals/page')).default;
      render(<HospitalsPage />);
      expect(screen.getByText('Você ainda não tem hospitais cadastrados.')).toBeInTheDocument();
    });
  });

  describe('Risk History handles empty data', () => {
    it('renders empty state with empty history array', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      const RiskHistoryPage = (await import('../app/(app)/risk-history/page')).default;
      render(<RiskHistoryPage />);
      expect(
        screen.getByText('Nenhum registro de Flow Score ainda. Seus dados aparecerão aqui conforme usar o app.')
      ).toBeInTheDocument();
    });
  });

  describe('Smart Planner handles error states', () => {
    it('renders error state when API fails', async () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: new Error('fail') });
      const SmartPlannerPage = (await import('../app/(app)/smart-planner/page')).default;
      render(<SmartPlannerPage />);
      expect(screen.getByText('Não foi possível gerar sugestões.')).toBeInTheDocument();
    });

    it('renders no scenarios available message', async () => {
      mockUseQuery.mockReturnValue({
        data: {
          financialGap: 5000,
          currentRevenue: 0,
          targetRevenue: 5000,
          gapPercentage: 100,
          isGoalAlreadyMet: false,
          suggestedScenarios: [],
        },
        isLoading: false,
        error: null,
      });
      const SmartPlannerPage = (await import('../app/(app)/smart-planner/page')).default;
      render(<SmartPlannerPage />);
      expect(screen.getByText('Nenhum cenário disponível.')).toBeInTheDocument();
    });
  });

  describe('Components handle loading states', () => {
    it('Dashboard shows spinner on loading', async () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      const DashboardPage = (await import('../app/(app)/dashboard/page')).default;
      render(<DashboardPage />);
      expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
    });

    it('Shifts shows spinner on loading', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: true });
      const ShiftsPage = (await import('../app/(app)/shifts/page')).default;
      render(<ShiftsPage />);
      expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
    });

    it('Hospitals shows spinner on loading', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: true });
      const HospitalsPage = (await import('../app/(app)/hospitals/page')).default;
      render(<HospitalsPage />);
      expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
    });

    it('Risk History shows spinner on loading', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: true });
      const RiskHistoryPage = (await import('../app/(app)/risk-history/page')).default;
      render(<RiskHistoryPage />);
      expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
    });

    it('Smart Planner shows spinner on loading', async () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
      const SmartPlannerPage = (await import('../app/(app)/smart-planner/page')).default;
      render(<SmartPlannerPage />);
      expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
    });
  });
});
