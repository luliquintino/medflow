import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  unwrap: jest.fn(),
}));

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('lucide-react', () => ({
  BarChart3: () => <span data-testid="icon-bar-chart" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Building2: () => <span data-testid="icon-building" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

import { AnalyticsPreview } from '../analytics-preview';

const mockUseQuery = useQuery as jest.Mock;

const mockAnalytics = {
  summary: {
    totalRevenue: 50000,
    totalShifts: 30,
    totalHours: 360,
    avgPerShift: 1666,
    avgPerHour: 138,
    bestHospital: 'Hospital Central',
    overallGrowthPercent: 12,
  },
  monthlyIncome: [],
  monthOverMonthGrowth: [],
  hospitalRanking: [],
  incomeByShiftType: [],
};

describe('AnalyticsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when analytics data is not available', () => {
    mockUseQuery.mockReturnValue({ data: undefined });
    const { container } = render(<AnalyticsPreview />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the card title with analytics label', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    expect(screen.getByText(/Analytics \(6 meses\)/)).toBeInTheDocument();
  });

  it('renders link to /analytics page', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    const link = screen.getByText('Ver completo');
    expect(link.closest('a')).toHaveAttribute('href', '/analytics');
  });

  it('renders total revenue formatted as currency', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('R$ 50000')).toBeInTheDocument();
  });

  it('renders growth percentage with positive sign', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    expect(screen.getByText('Tendência')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders best hospital name', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    expect(screen.getByText('Melhor Hospital')).toBeInTheDocument();
    expect(screen.getByText('Hospital Central')).toBeInTheDocument();
  });

  it('renders dash when bestHospital is null', () => {
    const analyticsNullHospital = {
      ...mockAnalytics,
      summary: { ...mockAnalytics.summary, bestHospital: null },
    };
    mockUseQuery.mockReturnValue({ data: analyticsNullHospital });
    render(<AnalyticsPreview />);
    // The em dash character is used for null values
    const dashElements = screen.getAllByText('—');
    expect(dashElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders dash when overallGrowthPercent is null', () => {
    const analyticsNullGrowth = {
      ...mockAnalytics,
      summary: { ...mockAnalytics.summary, overallGrowthPercent: null },
    };
    mockUseQuery.mockReturnValue({ data: analyticsNullGrowth });
    render(<AnalyticsPreview />);
    const dashElements = screen.getAllByText('—');
    expect(dashElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders icons', () => {
    mockUseQuery.mockReturnValue({ data: mockAnalytics });
    render(<AnalyticsPreview />);
    expect(screen.getByTestId('icon-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
    expect(screen.getByTestId('icon-building')).toBeInTheDocument();
  });
});
