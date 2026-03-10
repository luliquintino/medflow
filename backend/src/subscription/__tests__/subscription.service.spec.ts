import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = mockPrismaService;
  });

  describe('getSubscription', () => {
    it('should return subscription for user', async () => {
      const userId = 'user-1';
      const subscription = {
        id: 'sub-1',
        userId,
        plan: 'TRIAL',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-15'),
      };

      prisma.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getSubscription(userId);

      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(subscription);
    });

    it('should throw NotFoundException when no subscription exists', async () => {
      const userId = 'user-1';

      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      const userId = 'user-1';

      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription(userId)).rejects.toThrow('Assinatura não encontrada.');
    });

    it('should return subscription with PRO plan', async () => {
      const userId = 'user-1';
      const subscription = {
        id: 'sub-1',
        userId,
        plan: 'PRO',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: null,
      };

      prisma.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getSubscription(userId);

      expect(result.plan).toBe('PRO');
      expect(result.status).toBe('ACTIVE');
    });
  });
});
