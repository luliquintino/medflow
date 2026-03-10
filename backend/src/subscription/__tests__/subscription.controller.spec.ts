import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from '../subscription.controller';
import { SubscriptionService } from '../subscription.service';

const mockSubscriptionService = {
  getSubscription: jest.fn(),
};

describe('SubscriptionController', () => {
  let controller: SubscriptionController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [{ provide: SubscriptionService, useValue: mockSubscriptionService }],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  // ─── GET SUBSCRIPTION ──────────────────────────────

  describe('getSubscription', () => {
    it('should call subscriptionService.getSubscription with userId', async () => {
      const userId = 'user-1';
      const result = {
        plan: 'PRO',
        status: 'ACTIVE',
        expiresAt: '2026-12-31T23:59:59Z',
      };
      mockSubscriptionService.getSubscription.mockResolvedValue(result);

      expect(await controller.getSubscription(userId)).toEqual(result);
      expect(mockSubscriptionService.getSubscription).toHaveBeenCalledWith(userId);
    });

    it('should return free plan for user without subscription', async () => {
      const userId = 'user-free';
      const result = {
        plan: 'FREE',
        status: 'ACTIVE',
        expiresAt: null,
      };
      mockSubscriptionService.getSubscription.mockResolvedValue(result);

      expect(await controller.getSubscription(userId)).toEqual(result);
      expect(mockSubscriptionService.getSubscription).toHaveBeenCalledWith(userId);
    });
  });
});
