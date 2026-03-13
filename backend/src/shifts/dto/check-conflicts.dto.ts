import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckConflictsDto {
  @ApiProperty({ example: '2026-03-15T08:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  hours: number;

  @ApiPropertyOptional({ description: 'ID do plantão sendo editado (para excluir da verificação)' })
  @IsOptional()
  @IsString()
  excludeShiftId?: string;
}
