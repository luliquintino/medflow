import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../progress-bar';

describe('ProgressBar', () => {
  it('should render with correct width percentage', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('should clamp value at 0%', () => {
    const { container } = render(<ProgressBar value={-10} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('should clamp value at 100%', () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('should show label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel label="Progress" />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should not show label by default', () => {
    render(<ProgressBar value={50} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('should apply moss color by default', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveClass('bg-moss-500');
  });

  it('should apply amber color', () => {
    const { container } = render(<ProgressBar value={50} color="amber" />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveClass('bg-amber-500');
  });

  it('should apply red color', () => {
    const { container } = render(<ProgressBar value={50} color="red" />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveClass('bg-red-500');
  });

  it('should apply md size by default', () => {
    const { container } = render(<ProgressBar value={50} />);
    const track = container.querySelector('.bg-cream-200');
    expect(track).toHaveClass('h-2.5');
  });

  it('should apply sm size', () => {
    const { container } = render(<ProgressBar value={50} size="sm" />);
    const track = container.querySelector('.bg-cream-200');
    expect(track).toHaveClass('h-1.5');
  });

  it('should round percentage display', () => {
    render(<ProgressBar value={33.7} showLabel label="Test" />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });
});
