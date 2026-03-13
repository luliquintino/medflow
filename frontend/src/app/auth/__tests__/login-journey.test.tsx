import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetTokens = jest.fn();
const mockSetUser = jest.fn();
const mockPost = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/auth/login',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock('@/lib/api', () => ({
  api: { post: mockPost },
  getErrorMessage: jest.fn().mockReturnValue('Credenciais inválidas'),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    setTokens: mockSetTokens,
    setUser: mockSetUser,
  }),
}));

jest.mock('lucide-react', () => ({
  Mail: () => <span data-testid="icon-mail" />,
  Lock: () => <span data-testid="icon-lock" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

import LoginPage from '../login/page';

describe('Login Journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText('Med Flow')).toBeInTheDocument();
    expect(screen.getByText('Entre na sua conta')).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toBeInTheDocument();
    expect(screen.getByText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('has link to registration page', () => {
    render(<LoginPage />);
    expect(screen.getByText('Criar conta')).toBeInTheDocument();
    expect(screen.getByText('Criar conta').closest('a')).toHaveAttribute('href', '/auth/register');
  });

  it('has link to forgot password', () => {
    render(<LoginPage />);
    expect(screen.getByText('Esqueceu a senha?')).toBeInTheDocument();
    expect(screen.getByText('Esqueceu a senha?').closest('a')).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('shows validation error when email is empty on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('E-mail invalido')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty password on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Senha obrigatoria')).toBeInTheDocument();
    });
  });

  it('calls api on valid submit and stores tokens', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-123',
          refreshToken: 'refresh-123',
          user: {
            id: '1',
            name: 'Luiza',
            email: 'luiza@test.com',
            onboardingCompleted: true,
          },
        },
      },
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'luiza@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'luiza@test.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith('access-123', 'refresh-123');
      expect(mockSetUser).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to onboarding if user has not completed onboarding', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-123',
          refreshToken: 'refresh-123',
          user: {
            id: '1',
            name: 'Luiza',
            email: 'luiza@test.com',
            onboardingCompleted: false,
          },
        },
      },
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'luiza@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'luiza@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });
});
