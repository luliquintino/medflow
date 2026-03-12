import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ShiftsService } from '../shifts/shifts.service';
import { FinanceService } from '../finance/finance.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';

describe('Edge Cases', () => {
  let shiftsService: ShiftsService;
  let financeService: FinanceService;
  let usersService: UsersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        FinanceService,
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    shiftsService = module.get<ShiftsService>(ShiftsService);
    financeService = module.get<FinanceService>(FinanceService);
    usersService = module.get<UsersService>(UsersService);
    prisma = mockPrismaService;
  });

  describe('ShiftsService - hospital ownership edge cases', () => {
    const userId = 'user-1';
    const baseDto = {
      date: '2026-03-15T07:00:00.000Z',
      type: 'TWELVE_DAY' as const,
      hours: 12,
      value: 1500,
      location: 'Hospital A',
    };

    it('should throw NotFoundException when hospitalId belongs to a different user', async () => {
      const dtoWithHospital = { ...baseDto, hospitalId: 'hosp-other-user' };

      // Hospital exists but does not belong to this user,
      // so findFirst with { id, userId } returns null
      prisma.hospital.findFirst.mockResolvedValue(null);

      await expect(shiftsService.create(userId, dtoWithHospital)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.hospital.findFirst).toHaveBeenCalledWith({
        where: { id: 'hosp-other-user', userId },
      });
    });

    it('should throw NotFoundException when hospitalId does not exist at all', async () => {
      const dtoWithHospital = { ...baseDto, hospitalId: 'non-existent' };

      prisma.hospital.findFirst.mockResolvedValue(null);

      await expect(shiftsService.create(userId, dtoWithHospital)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create shift without hospitalId (null hospitalId in data)', async () => {
      const expectedShift = {
        id: 'shift-1',
        userId,
        ...baseDto,
        hospitalId: null,
      };
      prisma.shift.create.mockResolvedValue(expectedShift);

      const result = await shiftsService.create(userId, baseDto);

      expect(prisma.hospital.findFirst).not.toHaveBeenCalled();
      expect(prisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hospitalId: null,
          }),
        }),
      );
      expect(result).toEqual(expectedShift);
    });
  });

  describe('ShiftsService - findOne access control edge cases', () => {
    it('should throw ForbiddenException when accessing another users shift', async () => {
      const shift = {
        id: 'shift-1',
        userId: 'another-user',
        hours: 12,
        location: 'Hospital B',
      };
      prisma.shift.findUnique.mockResolvedValue(shift);

      await expect(shiftsService.findOne('user-1', 'shift-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findUnique.mockResolvedValue(null);

      await expect(shiftsService.findOne('user-1', 'nonexistent-shift')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('ShiftsService - update with date recalculation', () => {
    it('should recalculate endDate when date is updated', async () => {
      const userId = 'user-1';
      const existingShift = {
        id: 'shift-1',
        userId,
        hours: 12,
        date: new Date('2026-03-15T07:00:00.000Z'),
        endDate: new Date('2026-03-15T19:00:00.000Z'),
        location: 'Hospital A',
      };

      prisma.shift.findUnique.mockResolvedValue(existingShift);
      prisma.shift.update.mockResolvedValue({
        ...existingShift,
        date: new Date('2026-03-20T07:00:00.000Z'),
      });

      await shiftsService.update(userId, 'shift-1', {
        date: '2026-03-20T07:00:00.000Z',
      });

      expect(prisma.shift.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shift-1' },
          data: expect.objectContaining({
            date: expect.any(Date),
            endDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('ShiftsService - getWorkloadSummary with no work profile', () => {
    it('should use default energy costs when no work profile exists', async () => {
      const userId = 'user-1';
      prisma.shift.findMany.mockResolvedValue([]);
      prisma.workProfile.findUnique.mockResolvedValue(null);

      const result = await shiftsService.getWorkloadSummary(userId);

      expect(result).toBeDefined();
      expect(prisma.workProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('FinanceService - getSummary edge cases', () => {
    it('should throw NotFoundException when no financial profile exists', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(financeService.getSummary('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should calculate summary with no shifts', async () => {
      const profile = {
        id: 'fp-1',
        userId: 'user-1',
        savingsGoal: 2000,
        averageShiftValue: 1500,
        minimumMonthlyGoal: 5000,
        idealMonthlyGoal: 7000,
      };

      prisma.financialProfile.findUnique.mockResolvedValue(profile);
      prisma.shift.findMany.mockResolvedValue([]);

      const result = await financeService.getSummary('user-1');

      expect(result).toBeDefined();
      expect(result.confirmedShiftsCount).toBe(0);
      expect(result.confirmedRevenue).toBe(0);
      expect(result.simulatedShiftsCount).toBe(0);
      expect(result.simulatedRevenue).toBe(0);
    });

    it('should correctly separate confirmed and simulated shifts', async () => {
      const profile = {
        id: 'fp-1',
        userId: 'user-1',
        savingsGoal: 2000,
        averageShiftValue: 1500,
        minimumMonthlyGoal: 5000,
        idealMonthlyGoal: 7000,
      };

      const now = new Date();
      const shifts = [
        {
          id: 's1',
          userId: 'user-1',
          date: now,
          value: 1500,
          status: 'CONFIRMED',
          hours: 12,
          type: 'TWELVE_DAY',
        },
        {
          id: 's2',
          userId: 'user-1',
          date: now,
          value: 2000,
          status: 'SIMULATED',
          hours: 12,
          type: 'TWELVE_DAY',
        },
      ];

      prisma.financialProfile.findUnique.mockResolvedValue(profile);
      prisma.shift.findMany.mockResolvedValue(shifts);

      const result = await financeService.getSummary('user-1');

      expect(result.confirmedShiftsCount).toBe(1);
      expect(result.simulatedShiftsCount).toBe(1);
      expect(result.confirmedRevenue).toBe(1500);
      expect(result.simulatedRevenue).toBe(2000);
    });
  });

  describe('FinanceService - simulate edge cases', () => {
    it('should throw NotFoundException when no financial profile on simulate', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(financeService.simulate('user-1', { shiftValue: 1500 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('UsersService - getMe edge cases', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.getMe('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should return user data when user exists', async () => {
      const user = {
        id: 'user-1',
        name: 'Dr. Test',
        gender: null,
        email: 'test@example.com',
        avatarUrl: null,
        onboardingCompleted: true,
        createdAt: new Date(),
        financialProfile: null,
        workProfile: null,
        subscription: null,
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await usersService.getMe('user-1');

      expect(result).toEqual(user);
      expect(result.id).toBe('user-1');
    });
  });

  describe('UsersService - updateWorkProfile edge cases', () => {
    it('should throw NotFoundException when work profile does not exist', async () => {
      prisma.workProfile.findUnique.mockResolvedValue(null);

      await expect(
        usersService.updateWorkProfile('user-1', { maxWeeklyHours: 60 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update work profile when it exists', async () => {
      const workProfile = {
        id: 'wp-1',
        userId: 'user-1',
        maxWeeklyHours: 48,
        preferredRestDays: [0, 6],
        energyCostDiurno: 1.0,
        energyCostNoturno: 1.5,
        energyCost24h: 2.5,
      };
      const updatedProfile = { ...workProfile, maxWeeklyHours: 60 };

      prisma.workProfile.findUnique.mockResolvedValue(workProfile);
      prisma.workProfile.update.mockResolvedValue(updatedProfile);

      const result = await usersService.updateWorkProfile('user-1', {
        maxWeeklyHours: 60,
      });

      expect(result.maxWeeklyHours).toBe(60);
    });
  });

  describe('UsersService - deleteAccount', () => {
    it('should delete user and return success message', async () => {
      prisma.user.delete.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const result = await usersService.deleteAccount('user-1');

      expect(result.message).toBe('Conta excluída com sucesso.');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('ShiftsService - findAll with various query filters', () => {
    const userId = 'user-1';

    it('should handle empty query (no filters)', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      const result = await shiftsService.findAll(userId, {});

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { date: 'desc' },
        }),
      );
      expect(result).toEqual([]);
    });

    it('should handle query with only from date', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      await shiftsService.findAll(userId, {
        from: '2026-01-01T00:00:00.000Z',
      });

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            date: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should handle query with type filter', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      await shiftsService.findAll(userId, {
        type: 'TWELVE_DAY' as any,
      });

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            type: 'TWELVE_DAY',
          }),
        }),
      );
    });

    it('should handle query with status filter', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      await shiftsService.findAll(userId, {
        status: 'CONFIRMED' as any,
      });

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: 'CONFIRMED',
          }),
        }),
      );
    });
  });

  describe('ShiftsService - remove edge cases', () => {
    it('should throw NotFoundException when removing non-existent shift', async () => {
      prisma.shift.findUnique.mockResolvedValue(null);

      await expect(shiftsService.remove('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when removing another users shift', async () => {
      const shift = {
        id: 'shift-1',
        userId: 'other-user',
        hours: 12,
      };
      prisma.shift.findUnique.mockResolvedValue(shift);

      await expect(shiftsService.remove('user-1', 'shift-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
