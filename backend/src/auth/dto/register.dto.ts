import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '123456/SP' })
  @IsString()
  @Matches(
    /^\d{1,6}\/(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i,
    { message: 'CRM inválido. Use o formato: 123456/UF' },
  )
  crm: string;

  @ApiProperty({ example: 'ana@medflow.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8, { message: 'Mínimo 8 caracteres' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Senha deve conter pelo menos uma maiúscula, uma minúscula e um número',
  })
  password: string;

  @ApiPropertyOptional({ enum: Gender, example: 'FEMALE' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
