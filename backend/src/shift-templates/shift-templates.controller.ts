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
import { ShiftTemplatesService } from './shift-templates.service';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dto/update-shift-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Shift Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hospitals/:hospitalId/templates')
export class ShiftTemplatesController {
  constructor(private shiftTemplatesService: ShiftTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar template de plantão' })
  create(
    @CurrentUser('id') userId: string,
    @Param('hospitalId') hospitalId: string,
    @Body() dto: CreateShiftTemplateDto,
  ) {
    return this.shiftTemplatesService.create(userId, hospitalId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar templates do hospital' })
  findAll(@CurrentUser('id') userId: string, @Param('hospitalId') hospitalId: string) {
    return this.shiftTemplatesService.findAll(userId, hospitalId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar template por ID' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('hospitalId') hospitalId: string,
    @Param('id') id: string,
  ) {
    return this.shiftTemplatesService.findOne(userId, hospitalId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar template' })
  update(
    @CurrentUser('id') userId: string,
    @Param('hospitalId') hospitalId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftTemplateDto,
  ) {
    return this.shiftTemplatesService.update(userId, hospitalId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover template' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('hospitalId') hospitalId: string,
    @Param('id') id: string,
  ) {
    return this.shiftTemplatesService.remove(userId, hospitalId, id);
  }
}
