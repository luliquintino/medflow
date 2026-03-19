import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ScenarioShiftDto {
  @ApiProperty({ example: '2026-03-20', description: 'Data do plantão hipotético' })
  @IsString()
  date: string;

  @ApiProperty({
    example: 'TWELVE_DAY',
    enum: ['TWELVE_DAY', 'TWELVE_NIGHT', 'TWENTY_FOUR', 'TWENTY_FOUR_INVERTED'],
  })
  @IsEnum(['TWELVE_DAY', 'TWELVE_NIGHT', 'TWENTY_FOUR', 'TWENTY_FOUR_INVERTED'])
  type: string;

  @ApiProperty({ example: 1500, description: 'Valor do plantão em R$' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ required: false, description: 'ID do hospital (opcional)' })
  @IsOptional()
  @IsString()
  hospitalId?: string;
}

export class SimulateScenarioDto {
  @ApiProperty({ type: [ScenarioShiftDto], description: 'Plantões hipotéticos (max 10)' })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScenarioShiftDto)
  shifts: ScenarioShiftDto[];

  @ApiProperty({ enum: [1, 3, 6], description: 'Meses de projeção' })
  @IsNumber()
  @IsEnum([1, 3, 6])
  projectionMonths: 1 | 3 | 6;
}
