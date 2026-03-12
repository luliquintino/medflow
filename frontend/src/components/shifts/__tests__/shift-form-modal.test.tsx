import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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

const mockReset = jest.fn();
const mockSetValue = jest.fn();
const mockWatch = jest.fn((field: string) => {
  if (field === 'type') return 'TWELVE_DAY';
  if (field === 'status') return 'CONFIRMED';
  return '';
});

jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(() => ({})),
    handleSubmit: jest.fn(() => (e: any) => { e?.preventDefault(); }),
    reset: mockReset,
    setValue: mockSetValue,
    watch: mockWatch,
    formState: { errors: {}, isSubmitting: false },
  })),
}));

jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

jest.mock('zod', () => {
  const mockSchema = {
    min: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  };
  const z = {
    object: jest.fn(() => mockSchema),
    string: jest.fn(() => mockSchema),
    coerce: { number: jest.fn(() => mockSchema) },
    enum: jest.fn(() => mockSchema),
  };
  return { z, __esModule: true, default: z };
});

jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
}));

jest.mock('clsx', () => ({
  clsx: (...args: any[]) => args.filter(Boolean).join(' '),
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

import { ShiftFormModal } from '../shift-form-modal';

const mockUseQuery = useQuery as jest.Mock;

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  editingShift: null,
};

const mockEditingShift = {
  id: '1',
  date: '2025-01-15T08:00:00Z',
  endDate: '2025-01-15T20:00:00Z',
  type: 'TWELVE_DAY' as const,
  hours: 12,
  value: 1500,
  location: 'Hospital A',
  status: 'CONFIRMED' as const,
  hospitalId: null,
  createdAt: '2025-01-01T00:00:00Z',
};

describe('ShiftFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <ShiftFormModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders "Novo plantão" title when no editingShift', () => {
    render(<ShiftFormModal {...defaultProps} />);
    expect(screen.getByText('Novo plantão')).toBeInTheDocument();
  });

  it('renders "Editar plantão" title when editingShift provided', () => {
    render(
      <ShiftFormModal {...defaultProps} editingShift={mockEditingShift} />
    );
    expect(screen.getByText('Editar plantão')).toBeInTheDocument();
  });

  it('shows form fields (date input, type buttons, value input)', () => {
    render(<ShiftFormModal {...defaultProps} />);
    expect(screen.getByText('Data e hora')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Valor (R$)')).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByText('12h Diurno')).toBeInTheDocument();
    expect(screen.getByText('12h Noturno')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('24h Invertido')).toBeInTheDocument();
  });

  it('cancel button calls onClose', () => {
    const onClose = jest.fn();
    render(<ShiftFormModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows status toggle buttons', () => {
    render(<ShiftFormModal {...defaultProps} />);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Simulado')).toBeInTheDocument();
  });

  it('shows "Adicionar" submit button when creating new shift', () => {
    render(<ShiftFormModal {...defaultProps} />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows "Salvar" submit button when editing shift', () => {
    render(
      <ShiftFormModal {...defaultProps} editingShift={mockEditingShift} />
    );
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });
});
