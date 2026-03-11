import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  @ApiOperation({ summary: 'Cadastro de novo médico' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  async logout(@CurrentUser('id') userId: string, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(userId, dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('exchange-code')
  @ApiOperation({ summary: 'Trocar código de autorização por tokens' })
  async exchangeCode(@Body() body: { code: string }) {
    if (!body.code) {
      throw new BadRequestException('Código é obrigatório.');
    }
    return this.authService.exchangeAuthCode(body.code);
  }

  // ─── GOOGLE OAUTH ─────────────────────────────

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar login com Google' })
  async googleAuth() {
    // Passport redirects to Google automatically
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback do Google OAuth' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    const code = this.authService.createAuthCode(user.id, user.email);
    const frontendUrl = this.config.get<string>('frontendUrl') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  }
}
