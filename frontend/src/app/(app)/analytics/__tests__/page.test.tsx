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

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: { name: 'Luiza', email: 'luiza@test.com', gender: 'FEMALE' },
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

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

jest.mock('../_components/analytics-kpis', () => ({
  AnalyticsKPIs: () => <div data-testid="analytics-kpis" />,
}));

jest.mock('../_components/monthly-income-chart', () => ({
  MonthlyIncomeChart: () => <div data-testid="monthly-income-chart" />,
}));

jest.mock('../_components/hospital-ranking', () => ({
  HospitalRanking: () => <div data-testid="hospital-ranking" />,
}));

jest.mock('../_components/hospital-income-chart', () => ({
  HospitalIncomeChart: () => <div data-testid="hospital-income-chart" />,
}));

jest.mock('../_components/shift-type-breakdown', () => ({
  ShiftTypeBreakdown: () => <div data-testid="shift-type-breakdown" />,
}));

jest.mock('../_components/growth-trend-chart', () => ({
  GrowthTrendChart: () => <div data-testid="growth-trend-chart" />,
}));

import AnalyticsPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const analyticsData = {
  summary: {
    totalRevenue: 25000,
    totalShifts: 20,
    totalHours: 240,
    avgPerShift: 1250,
    avgPerHour: 104,
    bestHospital: 'Hospital A',
    overallGrowthPercent: 12,
  },
  monthlyIncome: [
    { label: 'Jan', year: 2026, month: 1, revenue: 5000, shiftCount: 4, totalHours: 48 },
  ],
  hospitalRanking: [
    { hospitalId: '1', hospitalName: 'Hospital A', totalRevenue: 15000, avgPerShift: 1500, shiftCount: 10, totalHours: 120, revenueShare: 60 },
  ],
  incomeByShiftType: [
    { type: 'TWELVE_HOURS', typeLabel: '12 horas', totalRevenue: 10000, shiftCount: 8, totalHours: 96, avgPerShift: 1250, avgPerHour: 104 },
  ],
  monthOverMonthGrowth: [
    { label: 'Jan', growthPercent: 5 },
  ],
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows PageSpinner when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<AnalyticsPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders "Analytics" heading when data is loaded', () => {
    mockUseQuery.mockReturnValue({ data: analyticsData, isLoading: false });
    render(<AnalyticsPage />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders period toggle buttons "6 meses" and "12 meses"', () => {
    mockUseQuery.mockReturnValue({ data: analyticsData, isLoading: false });
    render(<AnalyticsPage />);
    expect(screen.getByText('6 meses')).toBeInTheDocument();
    expect(screen.getByText('12 meses')).toBeInTheDocument();
  });

  it('renders all child components when data is loaded', () => {
    mockUseQuery.mockReturnValue({ data: analyticsData, isLoading: false });
    render(<AnalyticsPage />);
    expect(screen.getByTestId('analytics-kpis')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-income-chart')).toBeInTheDocument();
    expect(screen.getByTestId('hospital-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('hospital-income-chart')).toBeInTheDocument();
    expect(screen.getByTestId('shift-type-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('growth-trend-chart')).toBeInTheDocument();
  });
});
