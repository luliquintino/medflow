import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Override the auto-mock to provide a token via search params
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn().mockReturnValue('mock-token') }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
  getErrorMessage: jest.fn().mockReturnValue('Erro'),
}));

import ResetPasswordPage from '../page';

describe('ResetPasswordPage', () => {
  it('should render reset password form', () => {
    render(<ResetPasswordPage />);
    // Should have password fields
    const passwordInputs = screen.getAllByPlaceholderText(/senha/i);
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
  });
});
