import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Dr. Ana Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '123456/SP' })
  @IsString()
  @MinLength(4, { message: 'CRM inválido' })
  @MaxLength(20)
  crm: string;

  @ApiProperty({ example: 'ana@medflow.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
