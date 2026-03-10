import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPost = jest.fn();
const mockGetErrorMessage = jest.fn().mockReturnValue('Erro ao processar');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/auth/forgot-password',
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

jest.mock('lucide-react', () => ({
  Mail: () => <span data-testid="icon-mail" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Lock: () => <span data-testid="icon-lock" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

import ForgotPasswordPage from '../forgot-password/page';

describe('Password Recovery Journey', () => {
  describe('ForgotPasswordPage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders forgot password form', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText('Esqueceu sua senha?')).toBeInTheDocument();
      expect(screen.getByText(/Informe seu e-mail/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument();
    });

    it('submits forgot password request and shows reset link', async () => {
      const user = userEvent.setup();
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            resetUrl: 'http://localhost:3002/auth/reset-password?token=abc123',
          },
        },
      });

      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@test.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.com' });
      });

      await waitFor(() => {
        expect(screen.getByText('Link gerado com sucesso')).toBeInTheDocument();
      });

      expect(screen.getByText('Redefinir minha senha')).toBeInTheDocument();
    });

    it('shows error when email is not found (no resetUrl)', async () => {
      const user = userEvent.setup();
      mockPost.mockResolvedValueOnce({
        data: { data: { resetUrl: null } },
      });

      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@test.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(screen.getByText(/E-mail não encontrado/)).toBeInTheDocument();
      });
    });

    it('shows error when forgot password request fails', async () => {
      const user = userEvent.setup();
      mockPost.mockRejectedValueOnce(new Error('Server error'));

      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@test.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(screen.getByText('Erro ao processar')).toBeInTheDocument();
      });
    });

    it('has back to login link', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText('Voltar ao login')).toBeInTheDocument();
    });
  });
});
