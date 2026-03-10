import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail.service';

// Mock Resend
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'resend.apiKey': 're_test_api_key_123',
      'resend.from': 'Med Flow <onboarding@resend.dev>',
    };
    return config[key];
  }),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('sendWelcome', () => {
    it('should send a welcome email', async () => {
      const email = 'doctor@test.com';
      const name = 'Carlos Silva';

      await service.sendWelcome(email, name);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Med Flow <onboarding@resend.dev>',
          to: email,
          subject: expect.stringContaining('Bem-vindo'),
          html: expect.stringContaining('Carlos'),
        }),
      );
    });

    it('should use first name only in the email body', async () => {
      const email = 'doctor@test.com';
      const name = 'Maria Fernanda Santos';

      await service.sendWelcome(email, name);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Maria'),
        }),
      );
    });

    it('should not throw when send fails', async () => {
      mockSend.mockRejectedValue(new Error('API connection failed'));

      await expect(service.sendWelcome('doctor@test.com', 'Carlos Silva')).resolves.not.toThrow();
    });

    it('should not throw when Resend returns an error object', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      await expect(service.sendWelcome('doctor@test.com', 'Carlos Silva')).resolves.not.toThrow();
    });

    it('should include current year in the email', async () => {
      const currentYear = new Date().getFullYear().toString();

      await service.sendWelcome('doctor@test.com', 'Carlos Silva');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(currentYear),
        }),
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send a password reset email', async () => {
      const email = 'doctor@test.com';
      const name = 'Carlos Silva';
      const resetUrl = 'https://medflow.app/auth/reset-password?token=abc123';

      await service.sendPasswordReset(email, name, resetUrl);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Med Flow <onboarding@resend.dev>',
          to: email,
          subject: expect.stringContaining('Redefinir senha'),
          html: expect.stringContaining(resetUrl),
        }),
      );
    });

    it('should include first name in the reset email body', async () => {
      const email = 'doctor@test.com';
      const name = 'Ana Paula Costa';
      const resetUrl = 'https://medflow.app/auth/reset-password?token=xyz';

      await service.sendPasswordReset(email, name, resetUrl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Ana'),
        }),
      );
    });

    it('should include the reset URL in the email body', async () => {
      const resetUrl = 'https://medflow.app/auth/reset-password?token=reset-token-123';

      await service.sendPasswordReset('doctor@test.com', 'Carlos Silva', resetUrl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(resetUrl),
        }),
      );
    });

    it('should throw when send fails with an exception', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendPasswordReset('doctor@test.com', 'Carlos Silva', 'https://medflow.app/reset'),
      ).rejects.toThrow('Falha ao enviar e-mail de recuperação.');
    });

    it('should throw when Resend returns an error object', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      await expect(
        service.sendPasswordReset('doctor@test.com', 'Carlos Silva', 'https://medflow.app/reset'),
      ).rejects.toThrow('Falha ao enviar e-mail de recuperação.');
    });

    it('should include current year in the email', async () => {
      const currentYear = new Date().getFullYear().toString();

      await service.sendPasswordReset(
        'doctor@test.com',
        'Carlos Silva',
        'https://medflow.app/reset',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(currentYear),
        }),
      );
    });
  });

  describe('constructor', () => {
    it('should initialize Resend with API key from config', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Resend } = require('resend');
      expect(Resend).toHaveBeenCalledWith('re_test_api_key_123');
    });

    it('should use default from address when config is empty', async () => {
      const emptyConfigService = {
        get: jest.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [MailService, { provide: ConfigService, useValue: emptyConfigService }],
      }).compile();

      const svc = module.get<MailService>(MailService);
      await svc.sendWelcome('test@test.com', 'Test User');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Med Flow <onboarding@resend.dev>',
        }),
      );
    });
  });
});
