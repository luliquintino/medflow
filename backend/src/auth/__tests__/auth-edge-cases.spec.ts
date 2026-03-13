import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
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

describe('AuthService – Edge Cases', () => {
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

  // ─── LOGIN EDGE CASES ──────────────────────────────────

  describe('login – non-existent email', () => {
    it('should throw UnauthorizedException for non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'SomePass1!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nobody@example.com' },
        include: { subscription: { select: { plan: true, status: true } } },
      });
    });
  });

  describe('login – wrong password increments failedAttempts', () => {
    const userRecord = {
      id: 'user-1',
      name: 'Dr. Test',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      failedLoginAttempts: 2,
      lockedUntil: null,
      lastFailedLoginAt: null,
      gender: 'MALE',
      onboardingCompleted: false,
      subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
    };

    it('should increment failedAttempts on wrong password', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockPrismaService.user.findUnique.mockResolvedValue(userRecord);
      mockPrismaService.user.update.mockResolvedValue(userRecord);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          failedLoginAttempts: 3,
          lastFailedLoginAt: expect.any(Date),
        }),
      });
    });
  });

  describe('login – account lockout after 5 failed attempts', () => {
    it('should lock account when failedAttempts reaches 5', async () => {
      const userWith4Failures = {
        id: 'user-1',
        name: 'Dr. Test',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        failedLoginAttempts: 4,
        lockedUntil: null,
        lastFailedLoginAt: null,
        gender: 'MALE',
        onboardingCompleted: false,
        subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
      };

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockPrismaService.user.findUnique.mockResolvedValue(userWith4Failures);
      mockPrismaService.user.update.mockResolvedValue(userWith4Failures);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });

      // Verify lockedUntil is roughly 15 minutes from now
      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const lockedUntil = updateCall.data.lockedUntil as Date;
      const fifteenMinutesFromNow = Date.now() + 15 * 60 * 1000;
      expect(lockedUntil.getTime()).toBeGreaterThan(Date.now());
      expect(lockedUntil.getTime()).toBeLessThanOrEqual(fifteenMinutesFromNow + 1000);
    });

    it('should reject login when account is currently locked', async () => {
      const lockedUser = {
        id: 'user-1',
        name: 'Dr. Test',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
        lastFailedLoginAt: new Date(),
        gender: 'MALE',
        onboardingCompleted: false,
        subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'CorrectPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      // bcrypt.compare should NOT have been called (early return)
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  // ─── REGISTER EDGE CASES ───────────────────────────────

  describe('register – duplicate email', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'taken@example.com',
      });

      await expect(
        service.register({
          name: 'Dr. New',
          email: 'Taken@Example.com',
          password: 'StrongP@ss1',
          crm: 'CRM/SP 999999',
          gender: 'FEMALE' as const,
        }),
      ).rejects.toThrow(ConflictException);

      // Should have searched with lowercased email
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'taken@example.com' },
      });
    });
  });

  // ─── REFRESH TOKEN EDGE CASES ──────────────────────────

  describe('refreshTokens – expired token', () => {
    it('should throw UnauthorizedException for expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        userId: 'user-1',
        expiresAt: pastDate,
        user: { id: 'user-1', email: 'test@example.com' },
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Should NOT have attempted to delete the expired token
      expect(mockPrismaService.refreshToken.delete).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens – invalid (non-existent) token', () => {
    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('totally-invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
