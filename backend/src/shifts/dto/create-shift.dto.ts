import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: ShiftStatus, default: ShiftStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}
