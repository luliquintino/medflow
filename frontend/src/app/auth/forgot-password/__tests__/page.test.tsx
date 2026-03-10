import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
  getErrorMessage: jest.fn().mockReturnValue('Erro'),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock('lucide-react', () => ({
  Mail: () => <span data-testid="icon-mail" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

import ForgotPasswordPage from '../page';

describe('ForgotPasswordPage', () => {
  it('should render forgot password form', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('should show title', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Esqueceu sua senha?')).toBeInTheDocument();
  });

  it('should have back to login link', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText(/voltar/i)).toBeInTheDocument();
  });

  it('should show submit button', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument();
  });
});
