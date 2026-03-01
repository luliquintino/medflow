import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { SimulateShiftDto } from './dto/simulate-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro do mês atual' })
  getSummary(@CurrentUser('id') userId: string) {
    return this.financeService.getSummary(userId);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular impacto financeiro de um plantão hipotético' })
  simulate(
    @CurrentUser('id') userId: string,
    @Body() dto: SimulateShiftDto,
  ) {
    return this.financeService.simulate(userId, dto);
  }
}
