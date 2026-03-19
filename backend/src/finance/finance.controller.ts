import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { SimulateShiftDto } from './dto/simulate-shift.dto';
import { SimulateScenarioDto } from './dto/simulate-scenario.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro de um mês (padrão: mês atual)' })
  getSummary(@CurrentUser('id') userId: string, @Query() query: QueryFinanceDto) {
    return this.financeService.getSummary(userId, query.month, query.year);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Insights financeiros inteligentes' })
  getInsights(@CurrentUser('id') userId: string) {
    return this.financeService.getInsights(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Atualizar perfil financeiro (metas, poupança, valor médio)' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateFinancialProfileDto) {
    return this.financeService.updateProfile(userId, dto);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular impacto financeiro de um plantão hipotético' })
  simulate(@CurrentUser('id') userId: string, @Body() dto: SimulateShiftDto) {
    return this.financeService.simulate(userId, dto);
  }

  @Post('simulate-scenario')
  @ApiOperation({ summary: 'Simular cenário composto com múltiplos plantões e projeção' })
  simulateScenario(@CurrentUser('id') userId: string, @Body() dto: SimulateScenarioDto) {
    return this.financeService.simulateScenario(userId, dto);
  }
}
