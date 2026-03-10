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

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useParams: jest.fn(() => ({ hospitalId: 'h1' })),
}));

jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(() => ({})),
    handleSubmit: jest.fn(() => (e: any) => { e?.preventDefault(); }),
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn((field: string) => {
      if (field === 'type') return 'DIURNO_12H';
      if (field === 'isNightShift') return false;
      return '';
    }),
    formState: { errors: {}, isSubmitting: false },
  })),
}));

jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('clsx', () => ({
  clsx: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Trash2: () => <span data-testid="icon-trash" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  X: () => <span data-testid="icon-x" />,
  Moon: () => <span data-testid="icon-moon" />,
  Sun: () => <span data-testid="icon-sun" />,
  Clock: () => <span data-testid="icon-clock" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, icon, ...props }: any) => (
    <button onClick={onClick} {...props}>{icon}{children}</button>
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

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

jest.mock('@/hooks/use-confirm', () => ({
  useConfirm: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    ConfirmDialogComponent: null,
  }),
}));

import TemplatesPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockHospital = {
  id: 'h1',
  name: 'Hospital Santa Casa',
  city: 'São Paulo',
  state: 'SP',
  createdAt: '2025-01-01T00:00:00Z',
};

const mockTemplates = [
  {
    id: 't1',
    hospitalId: 'h1',
    name: 'Plantão padrão PS',
    type: 'DIURNO_12H',
    durationInHours: 12,
    defaultValue: 1500,
    isNightShift: false,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 't2',
    hospitalId: 'h1',
    name: 'Noturno UTI',
    type: 'NOTURNO_12H',
    durationInHours: 12,
    defaultValue: 2000,
    isNightShift: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('TemplatesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows PageSpinner while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<TemplatesPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders hospital name when loaded', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: mockHospital, isLoading: false })
      .mockReturnValueOnce({ data: mockTemplates, isLoading: false });
    render(<TemplatesPage />);
    expect(screen.getByText(/Hospital Santa Casa/)).toBeInTheDocument();
  });

  it('shows template list', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: mockHospital, isLoading: false })
      .mockReturnValueOnce({ data: mockTemplates, isLoading: false });
    render(<TemplatesPage />);
    expect(screen.getByText('Plantão padrão PS')).toBeInTheDocument();
    expect(screen.getByText('Noturno UTI')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: mockHospital, isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: false });
    render(<TemplatesPage />);
    expect(screen.getByText('Nenhum modelo de plantão cadastrado.')).toBeInTheDocument();
    expect(screen.getByText('Criar primeiro modelo')).toBeInTheDocument();
  });

  it('shows "Novo modelo" button', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: mockHospital, isLoading: false })
      .mockReturnValueOnce({ data: mockTemplates, isLoading: false });
    render(<TemplatesPage />);
    expect(screen.getByText('Novo modelo')).toBeInTheDocument();
  });

  it('shows template count', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: mockHospital, isLoading: false })
      .mockReturnValueOnce({ data: mockTemplates, isLoading: false });
    render(<TemplatesPage />);
    expect(screen.getByText(/2 modelos/)).toBeInTheDocument();
  });
});
