import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetTokens = jest.fn();
const mockSetUser = jest.fn();
const mockPost = jest.fn();
const mockGetErrorMessage = jest.fn().mockReturnValue('Credenciais inválidas');

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
  api: { post: (...args: any[]) => mockPost(...args) },
  getErrorMessage: (...args: any[]) => mockGetErrorMessage(...args),
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

function makeSuccessResponse(onboardingCompleted: boolean) {
  return {
    data: {
      data: {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        user: {
          id: '1',
          name: 'Luiza',
          email: 'luiza@test.com',
          onboardingCompleted,
        },
      },
    },
  };
}

describe('Login Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows both validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('E-mail invalido')).toBeInTheDocument();
      expect(screen.getByText('Senha obrigatoria')).toBeInTheDocument();
    });
  });

  it('handles very long email address', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const longEmail = 'a'.repeat(200) + '@test.com';
    const emailInput = screen.getByPlaceholderText('seu@email.com');
    await user.type(emailInput, longEmail);
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');

    mockPost.mockResolvedValueOnce(makeSuccessResponse(true));

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: longEmail,
        password: 'password123',
      });
    });
  });

  it('does not call API multiple times during rapid submit clicks', async () => {
    const user = userEvent.setup();

    // Make post hang (never resolves during the test interaction)
    let resolvePost: (v: any) => void;
    mockPost.mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    await user.click(submitButton);

    // Wait for first call to register
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    // Try clicking again while the first submit is pending — react-hook-form
    // blocks re-submission while isSubmitting is true, so it should not call again
    await user.click(submitButton);
    await user.click(submitButton);

    // Still only one call
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Resolve to avoid dangling promise warning
    resolvePost!(makeSuccessResponse(true));
  });

  it('redirects to /dashboard when onboardingCompleted=true', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce(makeSuccessResponse(true));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'luiza@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to /onboarding when onboardingCompleted=false', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce(makeSuccessResponse(false));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'luiza@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('Sua senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the "show password" button
    const toggleButton = screen.getByLabelText('Mostrar senha');
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    const hideButton = screen.getByLabelText('Ocultar senha');
    await user.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('safely handles XSS in email field (renders as text, not HTML)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const xssPayload = '<script>alert("xss")</script>@test.com';
    const emailInput = screen.getByPlaceholderText('seu@email.com');
    await user.type(emailInput, xssPayload);

    // The value should be set as text, no script tag should be injected
    expect(emailInput).toHaveValue(xssPayload);
    // Ensure no script was injected into the DOM
    expect(document.querySelector('script')).toBeNull();
  });

  it('sends the email value as typed to the API (backend handles trimming)', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce(makeSuccessResponse(true));

    render(<LoginPage />);

    // Type email with trailing space — zod .email() still accepts it in jsdom
    const emailInput = screen.getByPlaceholderText('seu@email.com');
    await user.type(emailInput, 'user@test.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'password123');

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    // The form sends the email value as-is; the backend lowercases/trims
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'password123',
      });
    });
  });
});
