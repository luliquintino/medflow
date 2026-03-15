import { IsOptional, IsEnum, IsNumberString, IsString } from 'class-validator';
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
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;

  @ApiPropertyOptional({ description: 'Max results (default 100, max 500)' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumberString()
  offset?: string;
}
