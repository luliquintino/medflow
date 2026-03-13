import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: {
      name: 'Dra. Luiza',
      email: 'luiza@test.com',
      gender: 'FEMALE',
    },
    setUser: jest.fn(),
    setTokens: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('lucide-react', () => ({
  User: () => <span data-testid="icon-user" />,
  Watch: () => <span data-testid="icon-watch" />,
  Activity: () => <span data-testid="icon-activity" />,
  Battery: () => <span data-testid="icon-battery" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  Save: () => <span data-testid="icon-save" />,
  Pencil: () => <span data-testid="icon-pencil" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, loading, icon, ...props }: any) => (
    <button onClick={onClick} disabled={loading} {...props}>{icon}{children}</button>
  ),
}));

import SettingsPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: {
        name: 'Dra. Luiza',
        email: 'luiza@test.com',
        gender: 'FEMALE',
        workProfile: {
          energyCostDiurno: 1.0,
          energyCostNoturno: 1.5,
          energyCost24h: 2.5,
        },
      },
      isLoading: false,
    });
  });

  it('renders settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('renders settings description', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Gerencie sua conta e preferências')).toBeInTheDocument();
  });

  it('shows profile section with user name', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Dra. Luiza')).toBeInTheDocument();
  });

  it('shows email in profile section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('luiza@test.com')).toBeInTheDocument();
  });

  it('shows gender label for female user', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Feminino')).toBeInTheDocument();
  });

  it('shows energy costs section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Custos Energéticos Pessoais')).toBeInTheDocument();
  });

  it('shows energy cost sliders', () => {
    render(<SettingsPage />);
    expect(screen.getByText('12h Diurno')).toBeInTheDocument();
    expect(screen.getByText('12h Noturno')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
  });

  it('does not render wearable providers (moved to dashboard)', () => {
    render(<SettingsPage />);
    expect(screen.queryByText('Wearables conectados')).not.toBeInTheDocument();
  });

  it('shows edit button for profile', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('shows save and restore buttons for energy', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
    expect(screen.getByText('Restaurar padrões')).toBeInTheDocument();
  });

  it('shows user initial avatar', () => {
    render(<SettingsPage />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows onboarding message when no work profile', () => {
    mockUseQuery.mockReturnValue({
      data: {
        name: 'Dra. Luiza',
        email: 'luiza@test.com',
        gender: 'FEMALE',
        workProfile: null,
      },
      isLoading: false,
    });
    render(<SettingsPage />);
    expect(
      screen.getByText('Complete o onboarding primeiro para configurar seus custos energéticos.')
    ).toBeInTheDocument();
  });
});
