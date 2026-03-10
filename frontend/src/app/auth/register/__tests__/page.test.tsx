import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
  getErrorMessage: jest.fn().mockReturnValue('Erro'),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    setTokens: jest.fn(),
    setUser: jest.fn(),
  }),
}));

// Must be imported after mocks
import RegisterPage from '../page';

describe('RegisterPage', () => {
  it('should render registration form', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Criar conta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('should have link to login', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });
});
