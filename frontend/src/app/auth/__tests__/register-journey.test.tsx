import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetTokens = jest.fn();
const mockSetUser = jest.fn();
const mockPost = jest.fn();
const mockGetErrorMessage = jest.fn().mockReturnValue('E-mail já cadastrado');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/auth/register',
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
  getErrorMessage: mockGetErrorMessage,
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    setTokens: mockSetTokens,
    setUser: mockSetUser,
  }),
}));

jest.mock('lucide-react', () => ({
  User: () => <span data-testid="icon-user" />,
  Mail: () => <span data-testid="icon-mail" />,
  Lock: () => <span data-testid="icon-lock" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
  FileText: () => <span data-testid="icon-file-text" />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

import RegisterPage from '../register/page';

describe('Register Journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders registration form correctly', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Med Flow')).toBeInTheDocument();
    expect(screen.getByText('Crie sua conta')).toBeInTheDocument();
    expect(screen.getByText('Nome completo')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toBeInTheDocument();
    expect(screen.getByText('Senha')).toBeInTheDocument();
    expect(screen.getByText('Confirmar senha')).toBeInTheDocument();
  });

  it('has link to login page', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('Entrar').closest('a')).toHaveAttribute('href', '/auth/login');
  });

  it('shows CRM field with hint', () => {
    render(<RegisterPage />);
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Formato: numero/UF (ex: 123456/SP)')).toBeInTheDocument();
  });

  it('shows submit button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('shows validation error for empty required fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('Nome obrigatorio')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('Maria Silva'), 'Maria Silva');
    await user.type(screen.getByPlaceholderText('123456/SP'), '123456/SP');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'maria@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    });
  });

  it('calls API on valid form submission', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-123',
          refreshToken: 'refresh-123',
          user: {
            id: '1',
            name: 'Maria Silva',
            email: 'maria@test.com',
            onboardingCompleted: false,
          },
        },
      },
    });

    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('Maria Silva'), 'Maria Silva');
    await user.type(screen.getByPlaceholderText('123456/SP'), '123456/SP');

    // Use fireEvent for email input to avoid type="email" constraint issues
    const emailInput = screen.getByPlaceholderText('seu@email.com');
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'maria@test.com' } });
      // Need to trigger react-hook-form's onChange
      fireEvent.input(emailInput, { target: { value: 'maria@test.com' } });
    });

    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1');
    await user.type(screen.getByPlaceholderText('Repita a senha'), 'Password1');

    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        name: 'Maria Silva',
        crm: '123456/SP',
        email: 'maria@test.com',
        password: 'Password1',
      }));
    });

    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith('access-123', 'refresh-123');
      expect(mockSetUser).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });
});
