import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { mockRouter } from 'next/navigation';
import RootPage from '../page';

describe('RootPage (Landing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should show landing page when no auth token', async () => {
    render(<RootPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Med Flow').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/Começar agora/)).toBeInTheDocument();
    expect(screen.getByText('Já tenho conta')).toBeInTheDocument();
  });

  it('should redirect to dashboard when auth token exists', async () => {
    localStorage.setItem(
      'medflow-auth',
      JSON.stringify({
        state: { accessToken: 'token-123', refreshToken: 'refresh-123' },
      })
    );
    render(<RootPage />);
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show feature cards', async () => {
    render(<RootPage />);
    await waitFor(() => {
      expect(screen.getByText('Controle financeiro inteligente')).toBeInTheDocument();
    });
    expect(screen.getByText('Proteção contra burnout')).toBeInTheDocument();
    expect(screen.getByText('Planejamento otimizado')).toBeInTheDocument();
    expect(screen.getByText('Sustentabilidade profissional')).toBeInTheDocument();
  });
});
