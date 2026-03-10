import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsArray, IsString, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OptimizationService } from './optimization.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class ApplyShiftDto {
  @IsString()
  templateId: string;

  @IsDateString()
  date: string;
}

class ApplyScenarioDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyShiftDto)
  shifts: ApplyShiftDto[];
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optimization')
export class OptimizationController {
  constructor(private optimizationService: OptimizationService) {}

  @Get('suggest')
  @ApiOperation({ summary: 'Obter cenarios de otimizacao de plantoes' })
  suggest(@CurrentUser('id') userId: string) {
    return this.optimizationService.suggest(userId);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Aplicar cenario criando plantoes simulados' })
  apply(@CurrentUser('id') userId: string, @Body() dto: ApplyScenarioDto) {
    return this.optimizationService.apply(userId, dto.shifts);
  }
}
