import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(() => ({})),
  QueryClientProvider: ({ children }: any) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

jest.mock('sonner', () => ({
  Toaster: (props: any) => <div data-testid="toaster" data-position={props.position} />,
}));

import { Providers } from '../providers';

describe('Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <Providers>
        <div>Test child content</div>
      </Providers>
    );
    expect(screen.getByText('Test child content')).toBeInTheDocument();
  });

  it('QueryClientProvider is present', () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>
    );
    expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
  });

  it('Toaster is rendered', () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>
    );
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('Toaster has top-right position', () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>
    );
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'top-right');
  });

  it('children are inside QueryClientProvider', () => {
    render(
      <Providers>
        <div data-testid="inner-child">wrapped</div>
      </Providers>
    );
    const provider = screen.getByTestId('query-client-provider');
    const child = screen.getByTestId('inner-child');
    expect(provider).toContainElement(child);
  });
});
