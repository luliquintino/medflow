import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../password-input';

jest.mock('lucide-react', () => ({
  Lock: () => <span data-testid="icon-lock" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
}));

describe('PasswordInput', () => {
  it('renders with label', () => {
    render(<PasswordInput label="Senha" />);
    expect(screen.getByText('Senha')).toBeInTheDocument();
  });

  it('renders as password type by default', () => {
    render(<PasswordInput label="Senha" placeholder="Digite" />);
    const input = screen.getByPlaceholderText('Digite');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles to text type when eye button is clicked', () => {
    render(<PasswordInput label="Senha" placeholder="Digite" />);
    const input = screen.getByPlaceholderText('Digite');
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });

    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password type on second click', () => {
    render(<PasswordInput label="Senha" placeholder="Digite" />);
    const input = screen.getByPlaceholderText('Digite');
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');

    const hideButton = screen.getByRole('button', { name: /ocultar senha/i });
    fireEvent.click(hideButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders lock icon', () => {
    render(<PasswordInput label="Senha" />);
    expect(screen.getByTestId('icon-lock')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<PasswordInput label="Senha" error="Senha muito curta" />);
    expect(screen.getByText('Senha muito curta')).toBeInTheDocument();
  });

  it('shows hint when provided and no error', () => {
    render(<PasswordInput label="Senha" hint="Mínimo 8 caracteres" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('toggle button has tabIndex -1 to avoid tab interference', () => {
    render(<PasswordInput label="Senha" placeholder="Digite" />);
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });
    expect(toggleButton).toHaveAttribute('tabindex', '-1');
  });

  it('calls onChange when typing', () => {
    const onChange = jest.fn();
    render(<PasswordInput label="Senha" placeholder="Digite" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Digite'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalled();
  });
});
