import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Hospitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo hospital' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar hospitais do usuário' })
  findAll(@CurrentUser('id') userId: string) {
    return this.hospitalsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar hospital por ID com templates' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.hospitalsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar hospital' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover hospital' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.hospitalsService.remove(userId, id);
  }
}
