import { useAuthStore } from '../auth.store';
import { act } from '@testing-library/react';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  onboardingCompleted: true,
  createdAt: '2026-01-01',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
      });
    });
    localStorage.clear();
  });

  it('should initialize with null values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('should set user', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser as any);
    });
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('should set tokens', () => {
    act(() => {
      useAuthStore.getState().setTokens('access-123', 'refresh-456');
    });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
  });

  it('should clear everything on logout', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser as any);
      useAuthStore.getState().setTokens('access', 'refresh');
      useAuthStore.getState().logout();
    });
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
