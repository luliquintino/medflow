import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: (name: string) => ({ name, onChange: jest.fn(), onBlur: jest.fn(), ref: jest.fn() }),
    handleSubmit: (fn: any) => (e: any) => { e?.preventDefault(); fn({}); },
    reset: jest.fn(),
    formState: { errors: {} },
  }),
}));

jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/input', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const InputComponent = React.forwardRef(({ label, error, ...props }: any, ref: any) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <span>{error}</span>}
    </div>
  ));
  InputComponent.displayName = 'Input';
  return { Input: InputComponent };
});

import { BudgetModal } from '../budget-modal';
import type { FinancialProfile } from '@/types';

const mockProfile: FinancialProfile = {
  id: '1',
  savingsGoal: 2000,
  averageShiftValue: 1500,
  minimumMonthlyGoal: 8000,
  idealMonthlyGoal: 15000,
};

describe('BudgetModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <BudgetModal isOpen={false} onClose={mockOnClose} profile={mockProfile} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title when isOpen is true', () => {
    render(<BudgetModal isOpen={true} onClose={mockOnClose} profile={mockProfile} />);
    expect(screen.getByText('Meu Orçamento')).toBeInTheDocument();
  });

  it('renders form field labels when open', () => {
    render(<BudgetModal isOpen={true} onClose={mockOnClose} profile={mockProfile} />);
    expect(screen.getByText('Meta mensal mínima (R$)')).toBeInTheDocument();
    expect(screen.getByText('Meta mensal ideal (R$)')).toBeInTheDocument();
    expect(screen.getByText('Meta de poupança mensal (R$)')).toBeInTheDocument();
  });

  it('renders the save button', () => {
    render(<BudgetModal isOpen={true} onClose={mockOnClose} profile={mockProfile} />);
    expect(screen.getByText('Salvar metas')).toBeInTheDocument();
  });

  it('renders the close button icon', () => {
    render(<BudgetModal isOpen={true} onClose={mockOnClose} profile={mockProfile} />);
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  it('renders Metas financeiras section heading', () => {
    render(<BudgetModal isOpen={true} onClose={mockOnClose} profile={mockProfile} />);
    expect(screen.getByText('Metas financeiras')).toBeInTheDocument();
  });
});
