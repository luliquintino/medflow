import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFinancialProfileDto {
  @ApiPropertyOptional({ example: 2500, description: 'Meta de poupança mensal (R$)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  savingsGoal?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Valor médio por plantão (R$)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageShiftValue?: number;

  @ApiPropertyOptional({ example: 7000, description: 'Meta mensal mínima (R$)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumMonthlyGoal?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Meta mensal ideal (R$)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  idealMonthlyGoal?: number;
}
