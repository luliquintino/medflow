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
}
