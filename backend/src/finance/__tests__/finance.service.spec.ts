import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinanceService } from '../finance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    prisma = mockPrismaService;
  });

  describe('getSummary', () => {
    const userId = 'user-1';

    it('should throw NotFoundException when no financial profile', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSummary(userId)).rejects.toThrow(NotFoundException);
    });

    it('should return financial summary with profile and shifts', async () => {
      const profile = {
        id: 'fp-1',
        userId,
        savingsGoal: 2000,
        averageShiftValue: 1500,
        minimumMonthlyGoal: 7000,
        idealMonthlyGoal: 10000,
      };
      const shifts = [
        {
          id: 'shift-1',
          userId,
          date: new Date('2026-03-10T07:00:00'),
          endDate: new Date('2026-03-10T19:00:00'),
          type: 'TWELVE_DAY',
          hours: 12,
          value: 1500,
          location: 'Hospital A',
          status: 'CONFIRMED',
        },
      ];

      prisma.financialProfile.findUnique.mockResolvedValue(profile);
      prisma.shift.findMany.mockResolvedValue(shifts);

      const result = await service.getSummary(userId);

      expect(result).toBeDefined();
      expect(prisma.financialProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
      expect(prisma.shift.findMany).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-1';

    it('should update financial profile', async () => {
      const existingProfile = {
        id: 'fp-1',
        userId,
        savingsGoal: 2000,
        averageShiftValue: 1500,
        minimumMonthlyGoal: 7000,
        idealMonthlyGoal: 10000,
      };
      const updateDto = { savingsGoal: 3000 };
      const updatedProfile = { ...existingProfile, ...updateDto };

      // findUnique called multiple times: check + recalculateGoals + return
      prisma.financialProfile.findUnique.mockResolvedValue(existingProfile);
      prisma.financialProfile.update.mockResolvedValue({ ...updatedProfile, id: 'fp-1' });

      const result = await service.updateProfile(userId, updateDto);

      expect(prisma.financialProfile.findUnique).toHaveBeenCalled();
      expect(prisma.financialProfile.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if profile not found', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(userId, { savingsGoal: 3000 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

});
