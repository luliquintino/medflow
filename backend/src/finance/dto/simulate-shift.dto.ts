import { IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulateShiftDto {
  @ApiProperty({ example: 1500, description: 'Valor do plantão hipotético' })
  @IsNumber()
  @Min(0)
  shiftValue: number;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsNumber()
  shiftHours?: number;
}
