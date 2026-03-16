import {
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';

export class OnboardingFinancialDto {
  @ApiProperty({ example: 7000 })
  @IsNumber()
  @Min(0)
  minimumMonthlyGoal: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  idealMonthlyGoal: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  savingsGoal: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  averageShiftValue: number;
}

export class OnboardingWorkDto {
  @ApiProperty({ enum: ShiftType, isArray: true })
  @IsArray()
  @IsEnum(ShiftType, { each: true })
  shiftTypes: ShiftType[];

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxWeeklyHours?: number;

  @ApiProperty({ example: [0, 6], description: '0=Dom ... 6=Sab', required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preferredRestDays?: number[];

  @ApiProperty({
    example: 1.0,
    required: false,
    description: 'Custo energético 12h diurno (0.5-5.0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  energyCostDiurno?: number;

  @ApiProperty({
    example: 1.5,
    required: false,
    description: 'Custo energético 12h noturno (0.5-5.0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  energyCostNoturno?: number;

  @ApiProperty({ example: 2.5, required: false, description: 'Custo energético 24h (0.5-5.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  energyCost24h?: number;

  @ApiProperty({
    example: 2.4,
    required: false,
    description: 'Custo energético 24h invertido (0.5-5.0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  energyCost24hInvertido?: number;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Máximo de plantões noturnos consecutivos',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  maxNightShifts?: number;
}

export class CompleteOnboardingDto {
  @ApiProperty({ type: OnboardingFinancialDto })
  @ValidateNested()
  @Type(() => OnboardingFinancialDto)
  financial: OnboardingFinancialDto;

  @ApiProperty({ type: OnboardingWorkDto })
  @ValidateNested()
  @Type(() => OnboardingWorkDto)
  work: OnboardingWorkDto;
}
