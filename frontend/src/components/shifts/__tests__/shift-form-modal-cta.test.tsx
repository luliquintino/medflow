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
const mockHandleSubmit = jest.fn((cb: any) => (e: any) => {
  e?.preventDefault();
  cb({
    date: '2025-01-15T08:00',
    type: 'TWELVE_DAY',
    value: 1500,
    location: 'Hospital A',
    notes: '',
    status: 'CONFIRMED',
  });
});

jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(() => ({})),
    handleSubmit: mockHandleSubmit,
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
  BarChart3: () => <span data-testid="icon-barchart3" />,
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

describe('ShiftFormModal – CTA & Status', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    editingShift: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders the simulation CTA link with correct href="/simulate"', () => {
    render(<ShiftFormModal {...defaultProps} />);

    const ctaLink = screen.getByText(
      'Faça a simulação e veja se é bom você aceitar esse plantão com base em dados'
    ).closest('a');

    expect(ctaLink).toHaveAttribute('href', '/simulate');
  });

  it('renders the simulation CTA with correct Portuguese text', () => {
    render(<ShiftFormModal {...defaultProps} />);

    expect(
      screen.getByText(
        'Faça a simulação e veja se é bom você aceitar esse plantão com base em dados'
      )
    ).toBeInTheDocument();
  });

  it('renders the BarChart3 icon inside the CTA', () => {
    render(<ShiftFormModal {...defaultProps} />);

    // The CTA link contains the BarChart3 icon (mocked as data-testid="icon-barchart3")
    expect(screen.getByTestId('icon-barchart3')).toBeInTheDocument();
  });

  it('clicking CTA calls onClose (closes the modal)', () => {
    const onClose = jest.fn();
    render(<ShiftFormModal {...defaultProps} onClose={onClose} />);

    const ctaLink = screen.getByText(
      'Faça a simulação e veja se é bom você aceitar esse plantão com base em dados'
    ).closest('a')!;

    fireEvent.click(ctaLink);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT render a CONFIRMED/SIMULATED status toggle (it was removed)', () => {
    render(<ShiftFormModal {...defaultProps} />);

    // The old status toggle buttons should not exist
    const allButtons = screen.getAllByRole('button');
    const statusButtons = allButtons.filter(
      (btn) =>
        btn.textContent === 'CONFIRMED' ||
        btn.textContent === 'SIMULATED' ||
        btn.textContent === 'Confirmado' ||
        btn.textContent === 'Simulado'
    );
    expect(statusButtons).toHaveLength(0);

    // There should be no select or radio for status
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
  });

  it('form submits with status defaulting to CONFIRMED', () => {
    const { useMutation } = require('@tanstack/react-query');
    const mockMutate = jest.fn();
    (useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: jest.fn(),
      isPending: false,
    });

    render(<ShiftFormModal {...defaultProps} />);

    // Click the submit button ("Adicionar")
    fireEvent.click(screen.getByText('Adicionar'));

    // handleSubmit callback should have been invoked with data including status: CONFIRMED
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CONFIRMED',
      })
    );
  });
});
