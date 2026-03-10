import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dto/update-shift-template.dto';

@Injectable()
export class ShiftTemplatesService {
  constructor(
    private prisma: PrismaService,
    private hospitalsService: HospitalsService,
  ) {}

  async create(userId: string, hospitalId: string, dto: CreateShiftTemplateDto) {
    await this.hospitalsService.findOne(userId, hospitalId);
    return this.prisma.shiftTemplate.create({
      data: {
        hospitalId,
        name: dto.name,
        type: dto.type,
        durationInHours: dto.durationInHours,
        defaultValue: dto.defaultValue,
        isNightShift: dto.isNightShift,
      },
    });
  }

  async findAll(userId: string, hospitalId: string) {
    await this.hospitalsService.findOne(userId, hospitalId);
    return this.prisma.shiftTemplate.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, hospitalId: string, id: string) {
    await this.hospitalsService.findOne(userId, hospitalId);
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id },
    });
    if (!template || template.hospitalId !== hospitalId) {
      throw new NotFoundException('Template não encontrado.');
    }
    return template;
  }

  async update(userId: string, hospitalId: string, id: string, dto: UpdateShiftTemplateDto) {
    await this.findOne(userId, hospitalId, id);
    return this.prisma.shiftTemplate.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(userId: string, hospitalId: string, id: string) {
    await this.findOne(userId, hospitalId, id);
    await this.prisma.shiftTemplate.delete({ where: { id } });
    return { message: 'Template removido com sucesso.' };
  }
}
