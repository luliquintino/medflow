import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WearableService } from './wearable.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wearable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wearable')
export class WearableController {
  constructor(private wearableService: WearableService) {}

  @Get('latest')
  @ApiOperation({ summary: '[Pro] Dados mais recentes do wearable' })
  getLatest(@CurrentUser('id') userId: string) {
    return this.wearableService.getLatestData(userId);
  }

  @Get('history')
  @ApiOperation({ summary: '[Pro] Histórico de dados do wearable' })
  getHistory(@CurrentUser('id') userId: string, @Query('days') days?: string) {
    return this.wearableService.getHistory(userId, days ? parseInt(days) : 7);
  }
}
