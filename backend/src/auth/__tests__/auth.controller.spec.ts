jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  googleLogin: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ─── REGISTER ───────────────────────────────────────

  describe('register', () => {
    it('should call authService.register with the dto and return the result', async () => {
      const dto = {
        name: 'Dr. Test',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        crm: 'CRM/SP 123456',
        gender: 'MALE' as const,
      };
      const result = { accessToken: 'token', refreshToken: 'refresh' };
      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(dto as any)).toEqual(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  // ─── LOGIN ──────────────────────────────────────────

  describe('login', () => {
    it('should call authService.login with the dto and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'StrongP@ss1' };
      const result = { accessToken: 'token', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto as any)).toEqual(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  // ─── REFRESH ────────────────────────────────────────

  describe('refresh', () => {
    it('should call authService.refreshTokens with the refresh token', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      const result = { accessToken: 'new-token', refreshToken: 'new-refresh' };
      mockAuthService.refreshTokens.mockResolvedValue(result);

      expect(await controller.refresh(dto as any)).toEqual(result);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  // ─── LOGOUT ─────────────────────────────────────────

  describe('logout', () => {
    it('should call authService.logout with userId and refresh token', async () => {
      const userId = 'user-1';
      const dto = { refreshToken: 'refresh-token' };
      const result = { message: 'Logged out' };
      mockAuthService.logout.mockResolvedValue(result);

      expect(await controller.logout(userId, dto as any)).toEqual(result);
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId, 'refresh-token');
    });
  });

  // ─── FORGOT PASSWORD ───────────────────────────────

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with the dto', async () => {
      const dto = { email: 'test@example.com' };
      const result = { message: 'Email sent' };
      mockAuthService.forgotPassword.mockResolvedValue(result);

      expect(await controller.forgotPassword(dto as any)).toEqual(result);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
    });
  });

  // ─── RESET PASSWORD ────────────────────────────────

  describe('resetPassword', () => {
    it('should call authService.resetPassword with the dto', async () => {
      const dto = { token: 'reset-token', password: 'NewP@ss1' };
      const result = { message: 'Password reset' };
      mockAuthService.resetPassword.mockResolvedValue(result);

      expect(await controller.resetPassword(dto as any)).toEqual(result);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  // ─── GOOGLE AUTH ────────────────────────────────────

  describe('googleAuth', () => {
    it('should be defined (Passport handles the redirect)', async () => {
      expect(controller.googleAuth).toBeDefined();
      // The method body is empty; Passport redirects automatically
      await controller.googleAuth();
    });
  });

  // ─── GOOGLE CALLBACK ───────────────────────────────

  describe('googleCallback', () => {
    it('should call authService.googleLogin and redirect to frontend', async () => {
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockAuthService.googleLogin.mockResolvedValue(tokens);

      const req = { user: { email: 'test@example.com', name: 'Dr. Test' } };
      const res = { redirect: jest.fn() };

      await controller.googleCallback(req as any, res as any);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(req.user);
      expect(res.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
      );
    });

    it('should use default frontend URL when config returns undefined', async () => {
      mockConfigService.get.mockReturnValueOnce(undefined);
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.googleLogin.mockResolvedValue(tokens);

      const req = { user: { email: 'test@example.com' } };
      const res = { redirect: jest.fn() };

      await controller.googleCallback(req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
      );
    });
  });
});
