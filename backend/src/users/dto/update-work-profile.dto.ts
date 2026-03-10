import { IsNumber, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkProfileDto {
  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  maxWeeklyHours?: number;

  @ApiProperty({ example: [0, 6], required: false })
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
}
