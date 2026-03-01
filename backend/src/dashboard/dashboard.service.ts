import { Injectable } from '@nestjs/common';
import { FinanceService } from '../finance/finance.service';
import { ShiftsService } from '../shifts/shifts.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

@Injectable()
export class DashboardService {
  constructor(
    private financeService: FinanceService,
    private shiftsService: ShiftsService,
    private riskService: RiskEngineService,
  ) {}

  async getDashboard(userId: string) {
    const [finance, workload, risk] = await Promise.allSettled([
      this.financeService.getSummary(userId),
      this.shiftsService.getWorkloadSummary(userId),
      this.riskService.evaluate(userId),
    ]);

    return {
      finance: finance.status === 'fulfilled' ? finance.value : null,
      workload: workload.status === 'fulfilled' ? workload.value : null,
      risk: risk.status === 'fulfilled' ? risk.value : null,
      generatedAt: new Date().toISOString(),
    };
  }
}
