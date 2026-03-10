import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('should render with placeholder', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should associate label with input via htmlFor', () => {
    render(<Input label="Email" />);
    const label = screen.getByText('Email');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('should show error message', () => {
    render(<Input error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('should apply error border style', () => {
    const { container } = render(<Input error="Error" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-red-300');
  });

  it('should show hint when no error', () => {
    render(<Input hint="Dica útil" />);
    expect(screen.getByText('Dica útil')).toBeInTheDocument();
  });

  it('should hide hint when error is present', () => {
    render(<Input hint="Dica útil" error="Error" />);
    expect(screen.queryByText('Dica útil')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should call onChange when value changes', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('should render left icon when provided', () => {
    render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should use custom id over label-derived id', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('should pass through additional HTML attributes', () => {
    render(<Input type="password" data-testid="pw-input" />);
    expect(screen.getByTestId('pw-input')).toHaveAttribute('type', 'password');
  });

  // Accessibility tests
  it('should set aria-invalid when error is present', () => {
    render(<Input label="Email" error="E-mail inválido" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should not set aria-invalid when no error', () => {
    render(<Input label="Email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('should set aria-describedby pointing to error message', () => {
    render(<Input label="Email" error="E-mail inválido" />);
    const input = screen.getByRole('textbox');
    const errorEl = screen.getByText('E-mail inválido');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(errorEl).toHaveAttribute('id', 'email-error');
  });

  it('should give error message role="alert"', () => {
    render(<Input label="Email" error="E-mail inválido" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('E-mail inválido');
  });

  it('should not have aria-describedby when no error', () => {
    render(<Input label="Email" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});
