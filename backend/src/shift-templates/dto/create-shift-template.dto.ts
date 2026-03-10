import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftTemplateType } from '@prisma/client';

export class CreateShiftTemplateDto {
  @ApiPropertyOptional({ example: 'Plantão diurno padrão' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: ShiftTemplateType })
  @IsEnum(ShiftTemplateType)
  type: ShiftTemplateType;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  durationInHours: number;

  @ApiProperty({ example: 1400 })
  @IsNumber()
  @Min(0)
  defaultValue: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isNightShift: boolean;
}
