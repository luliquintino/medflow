import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../sidebar';

jest.mock('lucide-react', () => ({
  LayoutDashboard: (props: any) => <svg data-testid="icon-dashboard" {...props} />,
  Calendar: (props: any) => <svg data-testid="icon-calendar" {...props} />,
  Clock: (props: any) => <svg data-testid="icon-clock" {...props} />,
  Building2: (props: any) => <svg data-testid="icon-building" {...props} />,
  TrendingUp: (props: any) => <svg data-testid="icon-trending" {...props} />,
  BarChart3: (props: any) => <svg data-testid="icon-barchart3" {...props} />,
  Zap: (props: any) => <svg data-testid="icon-zap" {...props} />,
  Brain: (props: any) => <svg data-testid="icon-brain" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="icon-alert" {...props} />,
  Settings: (props: any) => <svg data-testid="icon-settings" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
}));

const mockPush = jest.fn();
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockLogout = jest.fn();
jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: { name: 'Dra. Luiza', email: 'luiza@test.com', avatarUrl: null },
    logout: mockLogout,
    refreshToken: 'mock-refresh-token',
  }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn().mockResolvedValue({}) },
}));

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('should render all navigation items', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Meu Painel')).toBeInTheDocument();
    expect(screen.getByText('Plantões')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByText('Hospitais')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Aceito ou Não?')).toBeInTheDocument();
    expect(screen.getByText('Planejamento')).toBeInTheDocument();
    expect(screen.getByText('Histórico de Flow Score')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('should show Med Flow branding', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Med Flow')).toBeInTheDocument();
  });

  it('should display user name', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Dra. Luiza')).toBeInTheDocument();
  });

  it('should display user email', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('luiza@test.com')).toBeInTheDocument();
  });

  it('should have correct link hrefs', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Meu Painel').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Plantões').closest('a')).toHaveAttribute('href', '/shifts');
    expect(screen.getByText('Analytics').closest('a')).toHaveAttribute('href', '/analytics');
  });

  it('should render 9 navigation links', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    const links = screen.getAllByRole('link');
    // 9 nav items + possibly the logo link
    expect(links.length).toBeGreaterThanOrEqual(9);
  });
});
