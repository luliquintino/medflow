import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

const mockReplace = jest.fn();
const mockSetTokens = jest.fn();
const mockSetUser = jest.fn();
const mockApiGet = jest.fn();
let mockSearchParamsGet: jest.Mock;

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

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(() => ({
    setTokens: mockSetTokens,
    setUser: mockSetUser,
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: mockReplace })),
  useSearchParams: jest.fn(() => ({
    get: mockSearchParamsGet,
  })),
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

import CallbackPage from '../page';

describe('CallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet = jest.fn();
    mockApiGet.mockReturnValue(new Promise(() => {}));
  });

  it('shows PageSpinner during processing', () => {
    mockSearchParamsGet.mockReturnValue(null);
    render(<CallbackPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('redirects to /auth/login when token params missing', () => {
    mockSearchParamsGet.mockReturnValue(null);
    render(<CallbackPage />);
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
  });

  it('calls setTokens with params from URL', () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-access-token';
      if (key === 'refresh') return 'mock-refresh-token';
      return null;
    });
    render(<CallbackPage />);
    expect(mockSetTokens).toHaveBeenCalledWith('mock-access-token', 'mock-refresh-token');
  });
});
