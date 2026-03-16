import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../risk-badge';

describe('RiskBadge (FlowBadge)', () => {
  it('should render PILAR_SUSTENTAVEL level with "Sustentável" label', () => {
    render(<RiskBadge level="PILAR_SUSTENTAVEL" />);
    expect(screen.getByText('Sustentável')).toBeInTheDocument();
  });

  it('should render PILAR_CARGA_ELEVADA level with "Carga Elevada" label', () => {
    render(<RiskBadge level="PILAR_CARGA_ELEVADA" />);
    expect(screen.getByText('Carga Elevada')).toBeInTheDocument();
  });

  it('should render PILAR_RISCO_FADIGA level with "Risco de Fadiga" label', () => {
    render(<RiskBadge level="PILAR_RISCO_FADIGA" />);
    expect(screen.getByText('Risco de Fadiga')).toBeInTheDocument();
  });

  it('should render PILAR_ALTO_RISCO level with "Alto Risco" label', () => {
    render(<RiskBadge level="PILAR_ALTO_RISCO" />);
    expect(screen.getByText('Alto Risco')).toBeInTheDocument();
  });

  it('should apply PILAR_SUSTENTAVEL color classes', () => {
    render(<RiskBadge level="PILAR_SUSTENTAVEL" />);
    expect(screen.getByText('Sustentável')).toHaveClass('bg-moss-100', 'text-moss-700');
  });

  it('should apply PILAR_CARGA_ELEVADA color classes', () => {
    render(<RiskBadge level="PILAR_CARGA_ELEVADA" />);
    expect(screen.getByText('Carga Elevada')).toHaveClass('bg-amber-100', 'text-amber-700');
  });

  it('should apply PILAR_ALTO_RISCO color classes', () => {
    render(<RiskBadge level="PILAR_ALTO_RISCO" />);
    expect(screen.getByText('Alto Risco')).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('should show dot by default', () => {
    const { container } = render(<RiskBadge level="PILAR_SUSTENTAVEL" />);
    const dot = container.querySelector('.rounded-full.bg-moss-500');
    expect(dot).toBeInTheDocument();
  });

  it('should hide dot when showDot is false', () => {
    const { container } = render(<RiskBadge level="PILAR_SUSTENTAVEL" showDot={false} />);
    const dot = container.querySelector('.bg-moss-500');
    expect(dot).not.toBeInTheDocument();
  });

  it('should apply md size by default', () => {
    render(<RiskBadge level="PILAR_SUSTENTAVEL" />);
    expect(screen.getByText('Sustentável')).toHaveClass('px-3', 'py-1', 'text-sm');
  });

  it('should apply sm size', () => {
    render(<RiskBadge level="PILAR_SUSTENTAVEL" size="sm" />);
    expect(screen.getByText('Sustentável')).toHaveClass('px-2', 'text-xs');
  });
});
