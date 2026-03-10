import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

const mockUsersService = {
  getMe: jest.fn(),
  completeOnboarding: jest.fn(),
  updateProfile: jest.fn(),
  updateWorkProfile: jest.fn(),
  deleteAccount: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  // ─── GET ME ─────────────────────────────────────────

  describe('getMe', () => {
    it('should call usersService.getMe with userId', async () => {
      const userId = 'user-1';
      const result = { id: userId, name: 'Dr. Test', email: 'test@example.com' };
      mockUsersService.getMe.mockResolvedValue(result);

      expect(await controller.getMe(userId)).toEqual(result);
      expect(mockUsersService.getMe).toHaveBeenCalledWith(userId);
    });
  });

  // ─── COMPLETE ONBOARDING ───────────────────────────

  describe('completeOnboarding', () => {
    it('should call usersService.completeOnboarding with userId and dto', async () => {
      const userId = 'user-1';
      const dto = {
        specialty: 'CARDIOLOGY',
        yearsExperience: 5,
        monthlyIncomeGoal: 30000,
        weeklyHoursLimit: 60,
      };
      const result = { id: userId, onboardingComplete: true };
      mockUsersService.completeOnboarding.mockResolvedValue(result);

      expect(await controller.completeOnboarding(userId, dto as any)).toEqual(result);
      expect(mockUsersService.completeOnboarding).toHaveBeenCalledWith(userId, dto);
    });
  });

  // ─── UPDATE PROFILE ────────────────────────────────

  describe('updateProfile', () => {
    it('should call usersService.updateProfile with userId and body', async () => {
      const userId = 'user-1';
      const body = { name: 'Dr. Updated', avatarUrl: 'https://example.com/avatar.png' };
      const result = { id: userId, ...body };
      mockUsersService.updateProfile.mockResolvedValue(result);

      expect(await controller.updateProfile(userId, body)).toEqual(result);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, body);
    });

    it('should handle partial updates with gender', async () => {
      const userId = 'user-1';
      const body = { gender: 'FEMALE' as const };
      const result = { id: userId, gender: 'FEMALE' };
      mockUsersService.updateProfile.mockResolvedValue(result);

      expect(await controller.updateProfile(userId, body)).toEqual(result);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, body);
    });
  });

  // ─── UPDATE WORK PROFILE ──────────────────────────

  describe('updateWorkProfile', () => {
    it('should call usersService.updateWorkProfile with userId and dto', async () => {
      const userId = 'user-1';
      const dto = { weeklyHoursLimit: 50, monthlyIncomeGoal: 35000 };
      const result = { id: userId, ...dto };
      mockUsersService.updateWorkProfile.mockResolvedValue(result);

      expect(await controller.updateWorkProfile(userId, dto as any)).toEqual(result);
      expect(mockUsersService.updateWorkProfile).toHaveBeenCalledWith(userId, dto);
    });
  });

  // ─── DELETE ACCOUNT ────────────────────────────────

  describe('deleteAccount', () => {
    it('should call usersService.deleteAccount with userId', async () => {
      const userId = 'user-1';
      const result = { message: 'Account deleted' };
      mockUsersService.deleteAccount.mockResolvedValue(result);

      expect(await controller.deleteAccount(userId)).toEqual(result);
      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(userId);
    });
  });
});
