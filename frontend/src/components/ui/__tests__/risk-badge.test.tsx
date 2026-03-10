import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../risk-badge';

describe('RiskBadge', () => {
  it('should render SAFE level with "Seguro" label', () => {
    render(<RiskBadge level="SAFE" />);
    expect(screen.getByText('Seguro')).toBeInTheDocument();
  });

  it('should render MODERATE level with "Moderado" label', () => {
    render(<RiskBadge level="MODERATE" />);
    expect(screen.getByText('Moderado')).toBeInTheDocument();
  });

  it('should render HIGH level with "Alto" label', () => {
    render(<RiskBadge level="HIGH" />);
    expect(screen.getByText('Alto')).toBeInTheDocument();
  });

  it('should apply SAFE color classes', () => {
    render(<RiskBadge level="SAFE" />);
    expect(screen.getByText('Seguro')).toHaveClass('bg-moss-100', 'text-moss-700');
  });

  it('should apply MODERATE color classes', () => {
    render(<RiskBadge level="MODERATE" />);
    expect(screen.getByText('Moderado')).toHaveClass('bg-amber-100', 'text-amber-700');
  });

  it('should apply HIGH color classes', () => {
    render(<RiskBadge level="HIGH" />);
    expect(screen.getByText('Alto')).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('should show dot by default', () => {
    const { container } = render(<RiskBadge level="SAFE" />);
    const dot = container.querySelector('.rounded-full.bg-moss-500');
    expect(dot).toBeInTheDocument();
  });

  it('should hide dot when showDot is false', () => {
    const { container } = render(<RiskBadge level="SAFE" showDot={false} />);
    const dot = container.querySelector('.bg-moss-500');
    expect(dot).not.toBeInTheDocument();
  });

  it('should apply md size by default', () => {
    render(<RiskBadge level="SAFE" />);
    expect(screen.getByText('Seguro')).toHaveClass('px-3', 'py-1', 'text-sm');
  });

  it('should apply sm size', () => {
    render(<RiskBadge level="SAFE" size="sm" />);
    expect(screen.getByText('Seguro')).toHaveClass('px-2', 'text-xs');
  });
});
