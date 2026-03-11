import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private authCodes = new Map<string, { userId: string; email: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  // ─── REGISTER ───────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const rounds = this.config.get<number>('bcrypt.rounds') || 10;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        crm: dto.crm.toUpperCase(),
        gender: dto.gender,
        email: dto.email.toLowerCase(),
        passwordHash,
        subscription: {
          create: {
            plan: 'ESSENTIAL',
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
      select: {
        id: true,
        name: true,
        gender: true,
        email: true,
        crm: true,
        onboardingCompleted: true,
        subscription: { select: { plan: true, status: true } },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    // Send welcome email (non-blocking)
    this.mailService.sendWelcome(user.email, user.name).catch(() => {});

    this.logger.log(`New user registered: ${user.email}`);

    return { user, ...tokens };
  }

  // ─── LOGIN ──────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { subscription: { select: { plan: true, status: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Conta bloqueada temporariamente. Tente novamente em ${minutesLeft} minuto(s).`,
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: new Date(),
      };

      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    const { passwordHash, failedLoginAttempts, lockedUntil, lastFailedLoginAt, ...safeUser } = user;

    return { user: safeUser, ...tokens };
  }

  // ─── REFRESH TOKEN ───────────────────────────

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user.id, stored.user.email);
  }

  // ─── LOGOUT ─────────────────────────────────

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logout realizado com sucesso.' };
  }

  // ─── FORGOT PASSWORD ─────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const genericMessage = 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.';

    // Always return same message to prevent email enumeration
    if (!user) {
      return { message: genericMessage };
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    });

    const frontendUrl = this.config.get<string>('frontendUrl') || 'http://localhost:3002';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    // Send password reset email
    try {
      await this.mailService.sendPasswordReset(user.email, user.name, resetUrl);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch {
      this.logger.warn(`Could not send password reset email for ${user.email}`);
    }

    // Only return resetUrl in development (when email may not work)
    const isDev = this.config.get<string>('env') !== 'production';
    return {
      message: genericMessage,
      ...(isDev ? { resetUrl } : {}),
    };
  }

  // ─── RESET PASSWORD ──────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const rounds = this.config.get<number>('bcrypt.rounds') || 10;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Invalidate all refresh tokens — force re-login on all devices
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Senha alterada com sucesso.' };
  }

  // ─── GOOGLE OAUTH (upsert user) ───────────────

  async googleLogin(user: any) {
    return this.generateTokens(user.id, user.email);
  }

  // ─── AUTH CODE (for OAuth callback security) ──────

  createAuthCode(userId: string, email: string): string {
    const code = uuidv4();
    this.authCodes.set(code, {
      userId,
      email,
      expiresAt: Date.now() + 60 * 1000, // 60 seconds
    });

    // Cleanup expired codes periodically
    if (this.authCodes.size > 100) {
      const now = Date.now();
      for (const [key, val] of this.authCodes) {
        if (val.expiresAt < now) this.authCodes.delete(key);
      }
    }

    return code;
  }

  async exchangeAuthCode(code: string) {
    const entry = this.authCodes.get(code);

    if (!entry) {
      throw new UnauthorizedException('Código de autorização inválido.');
    }

    this.authCodes.delete(code);

    if (entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('Código de autorização expirado.');
    }

    return this.generateTokens(entry.userId, entry.email);
  }

  // ─── HELPERS (public for GoogleStrategy) ─────

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.secret'),
      expiresIn: this.config.get('jwt.expiry') || '15m',
    });

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
