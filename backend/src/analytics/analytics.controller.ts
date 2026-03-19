import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Dados analíticos de receita, hospitais e tendências' })
  getAnalytics(
    @CurrentUser('id') userId: string,
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getAnalytics(userId, query.monthsBack ?? 6);
  }

  @Get('hospital-roi')
  @ApiOperation({ summary: 'ROI composto por hospital com score e tier' })
  getHospitalRoi(
    @CurrentUser('id') userId: string,
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getHospitalRoi(userId, query.monthsBack ?? 6);
  }

  @Get('benchmarking')
  @ApiOperation({ summary: 'Benchmarking pessoal: comparação de performance e metas' })
  getBenchmarking(@CurrentUser('id') userId: string) {
    return this.analyticsService.getBenchmarking(userId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Insights estratégicos cruzando ROI, benchmarking e FlowScore' })
  getInsights(@CurrentUser('id') userId: string) {
    return this.analyticsService.getInsights(userId);
  }
}
