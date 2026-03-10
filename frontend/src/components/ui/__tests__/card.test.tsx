import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle } from '../card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply default md padding', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('should apply sm padding', () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('should apply lg padding', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    expect(container.firstChild).toHaveClass('p-8');
  });

  it('should apply no padding', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    expect(container.firstChild).not.toHaveClass('p-4');
    expect(container.firstChild).not.toHaveClass('p-6');
    expect(container.firstChild).not.toHaveClass('p-8');
  });

  it('should pass through custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should always have base styles', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('bg-cream-50', 'rounded-2xl');
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should have flex layout', () => {
    const { container } = render(<CardHeader>Content</CardHeader>);
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-between');
  });
});

describe('CardTitle', () => {
  it('should render as h3', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByText('Title');
    expect(heading.tagName).toBe('H3');
  });

  it('should have font styles', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title')).toHaveClass('text-base', 'font-semibold');
  });
});
