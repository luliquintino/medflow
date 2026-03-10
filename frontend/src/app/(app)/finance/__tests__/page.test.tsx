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
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Target: () => <span data-testid="icon-target" />,
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

jest.mock('@/components/shifts/shift-form-modal', () => ({
  ShiftFormModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="shift-form-modal">Shift Form</div> : null
  ),
}));

jest.mock('../_components/month-navigator', () => ({
  MonthNavigator: ({ month, year }: any) => (
    <div data-testid="month-navigator">Month: {month}/{year}</div>
  ),
}));

jest.mock('../_components/finance-kpis', () => ({
  FinanceKPIs: () => <div data-testid="finance-kpis">KPIs</div>,
}));

jest.mock('../_components/finance-progress', () => ({
  FinanceProgress: () => <div data-testid="finance-progress">Progress</div>,
}));

jest.mock('../_components/month-shifts-list', () => ({
  MonthShiftsList: () => <div data-testid="month-shifts-list">Shifts List</div>,
}));

jest.mock('../_components/projection-chart', () => ({
  ProjectionChart: () => <div data-testid="projection-chart">Chart</div>,
}));

jest.mock('../_components/finance-insights', () => ({
  FinanceInsights: () => <div data-testid="finance-insights">Insights</div>,
}));

jest.mock('../_components/budget-modal', () => ({
  BudgetModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="budget-modal">Budget Modal</div> : null
  ),
}));

jest.mock('../_components/analytics-preview', () => ({
  AnalyticsPreview: () => <div data-testid="analytics-preview">Analytics Preview</div>,
}));

jest.mock('@/hooks/use-confirm', () => ({
  useConfirm: () => ({ confirm: jest.fn(), ConfirmDialogComponent: null }),
}));

import FinancePage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockFinance = {
  minimumMonthlyGoal: 5000,
  idealMonthlyGoal: 10000,
  minimumShiftsRequired: 4,
  idealShiftsRequired: 7,
  currentRevenue: 6000,
  revenueToMinimum: 0,
  revenueToIdeal: 4000,
  progressToMinimum: 120,
  progressToIdeal: 60,
  isMinimumReached: true,
  isIdealReached: false,
  confirmedShiftsCount: 4,
  simulatedShiftsCount: 2,
  confirmedRevenue: 4500,
  simulatedRevenue: 1500,
  shifts: [],
  monthContext: {
    month: 1,
    year: 2025,
    isPast: false,
    isCurrent: true,
    isFuture: false,
  },
  projections: {
    threeMonths: [],
    sixMonths: [],
  },
  profile: {
    id: '1',
    savingsGoal: 2000,
    averageShiftValue: 1500,
    minimumMonthlyGoal: 5000,
    idealMonthlyGoal: 10000,
  },
};

describe('FinancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<FinancePage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders financial summary', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByText('Painel Financeiro')).toBeInTheDocument();
  });

  it('shows month navigator', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('month-navigator')).toBeInTheDocument();
  });

  it('renders finance KPIs', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('finance-kpis')).toBeInTheDocument();
  });

  it('renders finance progress for current month', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('finance-progress')).toBeInTheDocument();
  });

  it('shows shifts list', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('month-shifts-list')).toBeInTheDocument();
  });

  it('shows Editar Metas button', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByText('Editar Metas')).toBeInTheDocument();
  });

  it('shows minimum reached status message', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByText(/Meta mínima garantida/)).toBeInTheDocument();
  });

  it('shows projection chart for current month', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('projection-chart')).toBeInTheDocument();
  });

  it('shows finance insights for current month', () => {
    mockUseQuery.mockReturnValue({ data: mockFinance, isLoading: false });
    render(<FinancePage />);
    expect(screen.getByTestId('finance-insights')).toBeInTheDocument();
  });
});
