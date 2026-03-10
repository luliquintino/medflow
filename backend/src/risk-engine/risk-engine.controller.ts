import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';
import { RiskEngineService } from './risk-engine.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Risk Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risk')
export class RiskEngineController {
  constructor(private riskService: RiskEngineService) {}

  @Get('evaluate')
  @ApiOperation({ summary: 'Avaliar risco atual do médico' })
  evaluate(@CurrentUser('id') userId: string) {
    return this.riskService.evaluate(userId);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular risco com plantão hipotético' })
  simulate(
    @CurrentUser('id') userId: string,
    @Body() body: { date: string; type: ShiftType; hours: number },
  ) {
    return this.riskService.simulateWithShift(userId, body);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de risco acumulado' })
  history(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.riskService.getHistory(userId, limit ? parseInt(limit) : 30);
  }
}
