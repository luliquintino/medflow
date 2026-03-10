import { IsString, IsOptional, MinLength, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHospitalDto {
  @ApiProperty({ example: 'Hospital Santa Casa' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Pronto-socorro' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 15, description: 'Dia do mês em que o hospital paga (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;
}
