import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { FinanceModule } from '../finance/finance.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  imports: [FinanceModule, ShiftsModule, RiskEngineModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
