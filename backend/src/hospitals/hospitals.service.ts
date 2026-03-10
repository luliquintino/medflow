import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateHospitalDto) {
    return this.prisma.hospital.create({
      data: {
        userId,
        name: dto.name,
        city: dto.city,
        state: dto.state,
        notes: dto.notes,
        paymentDay: dto.paymentDay,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.hospital.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            templates: true,
            shifts: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: { templates: true },
    });
    if (!hospital || hospital.userId !== userId) {
      throw new NotFoundException('Hospital não encontrado.');
    }
    return hospital;
  }

  async update(userId: string, id: string, dto: UpdateHospitalDto) {
    await this.findOne(userId, id);
    return this.prisma.hospital.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.hospital.delete({ where: { id } });
    return { message: 'Hospital removido com sucesso.' };
  }
}
