import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';
import { mockJwtService } from '../../../test/mocks/jwt.mock';
import { mockConfigService } from '../../../test/mocks/config.mock';
import { mockMailService } from '../../../test/mocks/mail.mock';
import * as bcrypt from 'bcryptjs';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── REGISTER ───────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      name: 'Dr. Test',
      email: 'Test@Example.com',
      password: 'StrongP@ss1',
      crm: 'CRM/SP 123456',
      gender: 'MALE' as const,
    };

    const createdUser = {
      id: 'user-1',
      name: 'Dr. Test',
      email: 'test@example.com',
      crm: 'CRM/SP 123456',
      gender: 'MALE',
      onboardingCompleted: false,
      subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
    };

    it('should register a new user successfully', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Dr. Test',
            email: 'test@example.com',
            crm: 'CRM/SP 123456',
            passwordHash: 'hashed-password',
          }),
        }),
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(createdUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      await service.register(registerDto);

      expect(hashSpy).toHaveBeenCalledWith('StrongP@ss1', 4);
    });

    it('should send welcome email (non-blocking)', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      await service.register(registerDto);

      expect(mockMailService.sendWelcome).toHaveBeenCalledWith('test@example.com', 'Dr. Test');
    });
  });

  // ─── LOGIN ──────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'Test@Example.com', password: 'StrongP@ss1' };

    const userWithPassword = {
      id: 'user-1',
      name: 'Dr. Test',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      gender: 'MALE',
      onboardingCompleted: false,
      subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
    };

    it('should login successfully with correct credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockPrismaService.user.findUnique.mockResolvedValue(userWithPassword);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Should not expose passwordHash
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password wrong', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockPrismaService.user.findUnique.mockResolvedValue(userWithPassword);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if no passwordHash', async () => {
      const userWithoutPassword = { ...userWithPassword, passwordHash: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutPassword);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── REFRESH TOKENS ────────────────────────────────

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const storedToken = {
        id: 'rt-1',
        token: 'valid-refresh-token',
        userId: 'user-1',
        expiresAt: futureDate,
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-2',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: futureDate,
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if token not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredToken = {
        id: 'rt-1',
        token: 'expired-token',
        userId: 'user-1',
        expiresAt: pastDate,
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── LOGOUT ─────────────────────────────────────────

  describe('logout', () => {
    it('should delete specific refresh token', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-1', 'specific-token');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'specific-token' },
      });
      expect(result).toEqual({
        message: 'Logout realizado com sucesso.',
      });
    });

    it('should delete all refresh tokens when no token provided', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.logout('user-1');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({
        message: 'Logout realizado com sucesso.',
      });
    });
  });

  // ─── FORGOT PASSWORD ───────────────────────────────

  describe('forgotPassword', () => {
    const forgotDto = { email: 'Test@Example.com' };

    it('should send reset email for existing user', async () => {
      const user = {
        id: 'user-1',
        name: 'Dr. Test',
        email: 'test@example.com',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);

      const result = await service.forgotPassword(forgotDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          resetPasswordToken: 'mock-uuid',
          resetPasswordExpiry: expect.any(Date),
        }),
      });
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        'Dr. Test',
        'http://localhost:3000/auth/reset-password?token=mock-uuid',
      );
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('resetUrl');
      expect(result.resetUrl).toContain('mock-uuid');
    });

    it('should return resetUrl even when email sending fails', async () => {
      const user = {
        id: 'user-1',
        name: 'Dr. Test',
        email: 'test@example.com',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      mockMailService.sendPasswordReset.mockRejectedValue(new Error('Email failed'));

      const result = await service.forgotPassword(forgotDto);

      expect(result).toHaveProperty('resetUrl');
      expect(result.resetUrl).toContain('mock-uuid');
    });

    it('should return same message for non-existing email (no email enumeration)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotDto);

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result.resetUrl).toBeUndefined();
    });
  });

  // ─── RESET PASSWORD ────────────────────────────────

  describe('resetPassword', () => {
    const resetDto = { token: 'valid-token', password: 'NewP@ssw0rd' };

    it('should reset password successfully and invalidate all refresh tokens', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password' as never);

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        resetPasswordToken: 'valid-token',
        resetPasswordExpiry: new Date(Date.now() + 3600000),
      };
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.resetPassword(resetDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordHash: 'new-hashed-password',
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        },
      });
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({ message: 'Senha alterada com sucesso.' });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });
  });
});
