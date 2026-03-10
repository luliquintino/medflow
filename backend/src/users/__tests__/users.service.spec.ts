import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── GET ME ─────────────────────────────────────────

  describe('getMe', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Dr. Test',
        gender: 'MALE',
        email: 'test@example.com',
        avatarUrl: null,
        onboardingCompleted: true,
        createdAt: new Date(),
        financialProfile: null,
        workProfile: null,
        subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          name: true,
          gender: true,
          email: true,
          avatarUrl: true,
          onboardingCompleted: true,
          createdAt: true,
          financialProfile: true,
          workProfile: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE PROFILE ─────────────────────────────────

  describe('updateProfile', () => {
    it('should update user name', async () => {
      const updatedUser = {
        id: 'user-1',
        name: 'Dr. Updated',
        gender: 'MALE',
        email: 'test@example.com',
        avatarUrl: null,
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', {
        name: 'Dr. Updated',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Dr. Updated' },
        select: {
          id: true,
          name: true,
          gender: true,
          email: true,
          avatarUrl: true,
        },
      });
      expect(result.name).toBe('Dr. Updated');
    });

    it('should update user gender', async () => {
      const updatedUser = {
        id: 'user-1',
        name: 'Dr. Test',
        gender: 'FEMALE',
        email: 'test@example.com',
        avatarUrl: null,
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', {
        gender: 'FEMALE' as any,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gender: 'FEMALE' },
        select: {
          id: true,
          name: true,
          gender: true,
          email: true,
          avatarUrl: true,
        },
      });
      expect(result.gender).toBe('FEMALE');
    });
  });

  // ─── DELETE ACCOUNT ─────────────────────────────────

  describe('deleteAccount', () => {
    it('should delete user and return success message', async () => {
      mockPrismaService.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await service.deleteAccount('user-1');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual({
        message: 'Conta excluída com sucesso.',
      });
    });
  });

  // ─── COMPLETE ONBOARDING ────────────────────────────

  describe('completeOnboarding', () => {
    const onboardingDto = {
      financial: {
        savingsGoal: 2000,
        averageShiftValue: 1200,
        minimumMonthlyGoal: 5800,
        idealMonthlyGoal: 7800,
      },
      work: {
        shiftTypes: ['DIURNO', 'NOTURNO'],
        maxWeeklyHours: 60,
        preferredRestDays: [0, 6],
      },
    };

    const mockUserAfterOnboarding = {
      id: 'user-1',
      name: 'Dr. Test',
      gender: 'MALE',
      email: 'test@example.com',
      avatarUrl: null,
      onboardingCompleted: true,
      createdAt: new Date(),
      financialProfile: {
        savingsGoal: 2000,
        averageShiftValue: 1200,
        minimumMonthlyGoal: 5800,
        idealMonthlyGoal: 7800,
      },
      workProfile: {
        shiftTypes: ['DIURNO', 'NOTURNO'],
        maxWeeklyHours: 60,
      },
      subscription: { plan: 'ESSENTIAL', status: 'ACTIVE' },
    };

    it('should create financial profile if not exists', async () => {
      mockPrismaService.financialProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.financialProfile.create.mockResolvedValue({
        id: 'fp-1',
      });
      mockPrismaService.workProfile.upsert.mockResolvedValue({ id: 'wp-1' });
      mockPrismaService.user.update.mockResolvedValue({
        onboardingCompleted: true,
      });
      // getMe is called at end of completeOnboarding
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserAfterOnboarding);

      await service.completeOnboarding('user-1', onboardingDto as any);

      expect(mockPrismaService.financialProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrismaService.financialProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            savingsGoal: 2000,
            averageShiftValue: 1200,
            minimumMonthlyGoal: 5800,
            idealMonthlyGoal: 7800,
          }),
        }),
      );
    });

    it('should update financial profile if exists', async () => {
      const existingProfile = { id: 'fp-1', userId: 'user-1' };
      mockPrismaService.financialProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrismaService.financialProfile.update.mockResolvedValue({
        id: 'fp-1',
      });
      mockPrismaService.workProfile.upsert.mockResolvedValue({ id: 'wp-1' });
      mockPrismaService.user.update.mockResolvedValue({
        onboardingCompleted: true,
      });
      // getMe is called at end of completeOnboarding
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserAfterOnboarding);

      await service.completeOnboarding('user-1', onboardingDto as any);

      expect(mockPrismaService.financialProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            savingsGoal: 2000,
            averageShiftValue: 1200,
            minimumMonthlyGoal: 5800,
            idealMonthlyGoal: 7800,
          }),
        }),
      );
      expect(mockPrismaService.financialProfile.create).not.toHaveBeenCalled();
    });
  });
});
