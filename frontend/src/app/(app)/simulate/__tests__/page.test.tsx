import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

jest.mock('lucide-react', () => ({
  Zap: () => <span data-testid="icon-zap" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Clock: () => <span data-testid="icon-clock" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  Battery: () => <span data-testid="icon-battery" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, loading, ...props }: any) => (
    <button onClick={onClick} disabled={loading} {...props}>{children}</button>
  ),
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

jest.mock('@/components/ui/risk-badge', () => ({
  RiskBadge: ({ level }: any) => <span data-testid="risk-badge">{level}</span>,
}));

jest.mock('@/components/ui/progress-bar', () => ({
  ProgressBar: ({ label, value }: any) => <div data-testid="progress-bar">{label}: {value}%</div>,
}));

jest.mock('@/types', () => ({
  SHIFT_TYPE_LABELS: {
    TWELVE_HOURS: '12 horas',
    TWENTY_FOUR_HOURS: '24 horas',
    NIGHT: 'Noturno',
  },
  SHIFT_TYPE_HOURS: {
    TWELVE_HOURS: 12,
    TWENTY_FOUR_HOURS: 24,
    NIGHT: 12,
  },
}));

import SimulatePage from '../page';

describe('SimulatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders simulation page heading', () => {
    render(<SimulatePage />);
    expect(screen.getByText('Aceito ou Não?')).toBeInTheDocument();
  });

  it('renders simulation page description', () => {
    render(<SimulatePage />);
    expect(
      screen.getByText('Simule um plantão e veja o impacto antes de decidir.')
    ).toBeInTheDocument();
  });

  it('renders form card title', () => {
    render(<SimulatePage />);
    expect(screen.getByText('Dados do plantão')).toBeInTheDocument();
  });

  it('renders shift type buttons', () => {
    render(<SimulatePage />);
    expect(screen.getByText('12 horas')).toBeInTheDocument();
    expect(screen.getByText('24 horas')).toBeInTheDocument();
    expect(screen.getByText('Noturno')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<SimulatePage />);
    expect(screen.getByText('Tipo de plantão')).toBeInTheDocument();
    expect(screen.getByText('Data e hora do plantão')).toBeInTheDocument();
    expect(screen.getByText('Valor do plantão (R$)')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<SimulatePage />);
    expect(screen.getByText('Simular agora')).toBeInTheDocument();
  });
});
