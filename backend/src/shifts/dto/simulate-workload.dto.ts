import { IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';

export class SimulateWorkloadDto {
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
}
