import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private from: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('resend.apiKey');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — email sending disabled');
    }
    this.from = this.config.get<string>('resend.from') || 'Med Flow <onboarding@resend.dev>';
  }

  async sendPasswordReset(email: string, name: string, resetUrl: string): Promise<void> {
    const firstName = name.split(' ')[0];
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar Senha — Med Flow</title>
</head>
<body style="margin:0;padding:0;background:#eef2ea;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ea;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#fdfcf8;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#334924,#4d7235);padding:32px;text-align:center;">
              <span style="color:white;font-size:22px;font-weight:700;">⚡ Med Flow</span>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Seu copiloto de plantões</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#334924;font-size:20px;font-weight:600;margin:0 0 8px;">Olá, ${firstName}!</h2>
              <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Med Flow.
                Clique no botão abaixo para criar uma nova senha.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4d7235,#638f46);color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">
                  Redefinir minha senha
                </a>
              </div>
              <p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, pode ignorar este e-mail.
              </p>
              <p style="color:#718096;font-size:13px;line-height:1.6;margin:0;">
                Ou acesse: <a href="${resetUrl}" style="color:#4d7235;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e6eddc;text-align:center;">
              <p style="color:#a0aec0;font-size:12px;margin:0;">© ${year} Med Flow · Todos os direitos reservados</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (!this.resend) {
      this.logger.warn(`Skipping password reset email to ${email} — Resend not configured`);
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Redefinir senha — Med Flow',
        html,
      });

      if (error) {
        this.logger.error(`Resend error for ${email}: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
      throw new Error('Falha ao enviar e-mail de recuperação.');
    }
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const firstName = name.split(' ')[0];
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Bem-vindo ao Med Flow</title></head>
<body style="margin:0;padding:0;background:#eef2ea;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ea;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#fdfcf8;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#334924,#4d7235);padding:32px;text-align:center;">
              <span style="color:white;font-size:22px;font-weight:700;">⚡ Med Flow</span>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Seu copiloto de plantões</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#334924;font-size:20px;font-weight:600;margin:0 0 8px;">Bem-vindo, ${firstName}! 🎉</h2>
              <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Sua conta foi criada com sucesso. Você tem <strong>14 dias de trial gratuito</strong>.
              </p>
              <ul style="color:#4a5568;font-size:14px;line-height:1.8;padding-left:20px;">
                <li>📊 Controle financeiro em tempo real</li>
                <li>🕐 Gestão inteligente de plantões</li>
                <li>⚡ Motor de risco personalizado</li>
                <li>📱 Integração com wearables</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e6eddc;text-align:center;">
              <p style="color:#a0aec0;font-size:12px;margin:0;">© ${year} Med Flow</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (!this.resend) {
      this.logger.warn(`Skipping welcome email to ${email} — Resend not configured`);
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Bem-vindo ao Med Flow! 🎉',
        html,
      });

      if (error) {
        this.logger.error(`Resend welcome error for ${email}: ${error.message}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err);
    }
  }
}
