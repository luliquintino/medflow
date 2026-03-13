import { IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';

export class QueryShiftHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  year?: string;

  @ApiPropertyOptional()
  @IsOptional()
  hospitalId?: string;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;
}
