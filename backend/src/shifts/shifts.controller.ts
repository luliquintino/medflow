import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo plantão' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar plantões com filtros' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryShiftsDto) {
    return this.shiftsService.findAll(userId, query);
  }

  @Get('workload')
  @ApiOperation({ summary: 'Resumo de carga horária atual' })
  getWorkload(@CurrentUser('id') userId: string) {
    return this.shiftsService.getWorkloadSummary(userId);
  }

  @Post('simulate-workload')
  @ApiOperation({ summary: 'Simular carga de trabalho com plantão hipotético' })
  simulateWorkload(
    @CurrentUser('id') userId: string,
    @Body() body: { date: string; type: ShiftType; hours: number; value: number },
  ) {
    return this.shiftsService.simulateWorkload(userId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar plantão por ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shiftsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar plantão' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover plantão' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shiftsService.remove(userId, id);
  }
}
