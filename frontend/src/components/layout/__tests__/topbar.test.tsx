import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Topbar } from '../topbar';

jest.mock('lucide-react', () => ({
  Bell: (props: any) => <svg data-testid="bell-icon" {...props} />,
  Menu: (props: any) => <svg data-testid="menu-icon" {...props} />,
}));

const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('Topbar', () => {
  const onMenuToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show "Meu Painel" title on dashboard page', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByText('Meu Painel')).toBeInTheDocument();
  });

  it('should NOT show title on non-dashboard pages', () => {
    mockUsePathname.mockReturnValue('/shifts');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.queryByText('Meu Painel')).not.toBeInTheDocument();
    expect(screen.queryByText('Meus Plantões')).not.toBeInTheDocument();
  });

  it('should NOT show title on finance page', () => {
    mockUsePathname.mockReturnValue('/finance');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should NOT show title on settings page', () => {
    mockUsePathname.mockReturnValue('/settings');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render logo', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByAltText('Med Flow')).toBeInTheDocument();
  });

  it('should render hamburger menu button', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
  });

  it('should call onMenuToggle when hamburger is clicked', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('should render bell notification icon', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });
});
