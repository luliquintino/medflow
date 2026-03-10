import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftType, ShiftStatus } from '@prisma/client';

export class CreateShiftDto {
  @ApiProperty({ example: '2026-03-15T08:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  type: ShiftType;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  hours: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: 'Hospital Santa Casa' })
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ShiftStatus, default: ShiftStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ description: 'ID do hospital associado' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: 'Se o plantão foi realizado' })
  @IsOptional()
  @IsBoolean()
  realized?: boolean;
}
