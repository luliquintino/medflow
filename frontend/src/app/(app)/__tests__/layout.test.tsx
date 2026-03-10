import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

const mockReplace = jest.fn();
const mockApiGet = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  unwrap: jest.fn((r: any) => r),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

let mockUser: any = null;
let mockAccessToken: string | null = null;

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(() => ({
    user: mockUser,
    accessToken: mockAccessToken,
    setUser: jest.fn(),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: mockReplace })),
  usePathname: jest.fn(() => '/dashboard'),
}));

jest.mock('@/components/layout/sidebar', () => ({
  Sidebar: ({ isOpen }: any) => (
    <div data-testid="sidebar">{isOpen ? 'open' : 'closed'}</div>
  ),
}));

jest.mock('@/components/layout/topbar', () => ({
  Topbar: () => <div data-testid="topbar">Topbar</div>,
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import AppLayout from '../layout';

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockUser = null;
    mockAccessToken = null;
    mockApiGet.mockReturnValue(new Promise(() => {}));
  });

  it('shows PageSpinner during loading', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ state: { accessToken: 'tok' } })
    );
    mockAccessToken = 'tok';
    render(<AppLayout><div>child</div></AppLayout>);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('redirects to /auth/login when no accessToken', () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<AppLayout><div>child</div></AppLayout>);
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
  });

  it('renders children when authenticated', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ state: { accessToken: 'tok' } })
    );
    mockUser = { name: 'Test', email: 'test@test.com', onboardingCompleted: true };
    mockAccessToken = 'tok';
    render(<AppLayout><div>child content</div></AppLayout>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders sidebar and topbar when authenticated', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ state: { accessToken: 'tok' } })
    );
    mockUser = { name: 'Test', email: 'test@test.com', onboardingCompleted: true };
    mockAccessToken = 'tok';
    render(<AppLayout><div>child</div></AppLayout>);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });
});
