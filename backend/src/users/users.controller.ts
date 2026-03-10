import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CompleteOnboardingDto } from './dto/onboarding.dto';
import { UpdateWorkProfileDto } from './dto/update-work-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil completo do usuário logado' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Completar onboarding inicial' })
  completeOnboarding(@CurrentUser('id') userId: string, @Body() dto: CompleteOnboardingDto) {
    return this.usersService.completeOnboarding(userId, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Atualizar perfil' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      name?: string;
      avatarUrl?: string;
      gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
    },
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Patch('work-profile')
  @ApiOperation({ summary: 'Atualizar perfil de trabalho (custos energéticos, limites)' })
  updateWorkProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateWorkProfileDto) {
    return this.usersService.updateWorkProfile(userId, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir conta' })
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}
