import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: { name: 'Dra. Luiza', email: 'luiza@test.com', gender: 'FEMALE' },
    setUser: jest.fn(),
    setTokens: jest.fn(),
  }),
}));

jest.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ label, error, hint, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input aria-label={label} {...props} />
      {hint && <span>{hint}</span>}
      {error && <span>{error}</span>}
    </div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, loading, icon, ...props }: any) => (
    <button onClick={onClick} disabled={loading} {...props}>{icon}{children}</button>
  ),
}));

import OnboardingPage from '../page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders onboarding heading', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Vamos começar')).toBeInTheDocument();
  });

  it('shows step indicator - Passo 1 de 2', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
  });

  it('renders step 1 - financial profile', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Perfil financeiro')).toBeInTheDocument();
  });

  it('renders step 1 description', () => {
    render(<OnboardingPage />);
    expect(
      screen.getByText('Essas informações nos ajudam a calcular quantos plantões você precisa fazer.')
    ).toBeInTheDocument();
  });

  it('renders financial form fields in step 1', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Meta mensal mínima (R$)')).toBeInTheDocument();
    expect(screen.getByText('Meta mensal ideal (R$)')).toBeInTheDocument();
    expect(screen.getByText('Meta de reserva/poupança mensal (R$)')).toBeInTheDocument();
    expect(screen.getByText('Valor médio por plantão (R$)')).toBeInTheDocument();
  });

  it('renders next button on step 1', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Próximo')).toBeInTheDocument();
  });

  it('renders Med Flow logo alt text', () => {
    render(<OnboardingPage />);
    expect(screen.getByAltText('Med Flow')).toBeInTheDocument();
  });
});
