import { Module } from '@nestjs/common';
import { WearableService } from './wearable.service';
import { WearableController } from './wearable.controller';

@Module({
  controllers: [WearableController],
  providers: [WearableService],
  exports: [WearableService],
})
export class WearableModule {}
