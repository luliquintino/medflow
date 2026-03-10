import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import LoginPage from '../page';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    setTokens: jest.fn(),
    setUser: jest.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('Med Flow')).toBeInTheDocument();
    expect(screen.getByText('Entre na sua conta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sua senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should have link to register', () => {
    render(<LoginPage />);
    expect(screen.getByText('Criar conta')).toBeInTheDocument();
  });

  it('should have link to forgot password', () => {
    render(<LoginPage />);
    expect(screen.getByText('Esqueceu a senha?')).toBeInTheDocument();
  });
});
