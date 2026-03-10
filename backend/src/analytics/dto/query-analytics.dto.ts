import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAnalyticsDto {
  @ApiPropertyOptional({ example: 6, description: 'Meses para análise (3-12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(12)
  monthsBack?: number;
}
