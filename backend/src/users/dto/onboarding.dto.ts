import {
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsString,
  Min,
  IsInt,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';

export class InstallmentDto {
  @ApiProperty({ example: 'Financiamento carro' })
  @IsString()
  description: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @Min(0)
  monthlyValue: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(1)
  remainingMonths: number;
}

export class OnboardingFinancialDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  fixedMonthlyCosts: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  savingsGoal: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  averageShiftValue: number;

  @ApiProperty({ type: [InstallmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];
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
  @Max(120)
  maxWeeklyHours?: number;

  @ApiProperty({ example: [0, 6], description: '0=Dom ... 6=Sab', required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preferredRestDays?: number[];
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
