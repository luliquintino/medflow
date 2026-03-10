import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkloadEngine, EnergyCosts, DEFAULT_ENERGY_COSTS } from './shifts.engine';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ShiftType } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateShiftDto) {
    const date = new Date(dto.date);
    const endDate = new Date(date.getTime() + dto.hours * 60 * 60 * 1000);

    // If hospitalId provided, validate ownership
    if (dto.hospitalId) {
      const hospital = await this.prisma.hospital.findFirst({
        where: { id: dto.hospitalId, userId },
      });
      if (!hospital) {
        throw new NotFoundException('Hospital não encontrado.');
      }
    }

    return this.prisma.shift.create({
      data: {
        userId,
        date,
        endDate,
        type: dto.type,
        hours: dto.hours,
        value: dto.value,
        location: dto.location,
        notes: dto.notes,
        status: dto.status || 'CONFIRMED',
        hospitalId: dto.hospitalId || null,
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(userId: string, query: QueryShiftsDto) {
    const where: any = { userId };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    return this.prisma.shift.findMany({
      where,
      include: {
        hospital: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Plantão não encontrado.');
    if (shift.userId !== userId) throw new ForbiddenException();
    return shift;
  }

  async update(userId: string, id: string, dto: UpdateShiftDto) {
    await this.findOne(userId, id);
    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(dto.date);
      const hours = dto.hours ?? (await this.findOne(userId, id)).hours;
      data.endDate = new Date(data.date.getTime() + hours * 60 * 60 * 1000);
    }
    return this.prisma.shift.update({
      where: { id },
      data,
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.shift.delete({ where: { id } });
    return { message: 'Plantão removido com sucesso.' };
  }

  async getWorkloadSummary(userId: string) {
    const [shifts, workProfile] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workProfile.findUnique({ where: { userId } }),
    ]);

    const energyCosts = this.getEnergyCosts(workProfile);
    return WorkloadEngine.calculate(shifts as any, new Date(), energyCosts);
  }

  async simulateWorkload(
    userId: string,
    hypothetical: { date: string; type: ShiftType; hours: number; value: number },
  ) {
    const [shifts, workProfile] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId, status: 'CONFIRMED' },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workProfile.findUnique({ where: { userId } }),
    ]);

    const energyCosts = this.getEnergyCosts(workProfile);
    const hyp = {
      date: new Date(hypothetical.date),
      type: hypothetical.type,
      hours: hypothetical.hours,
      value: hypothetical.value,
    };

    const before = WorkloadEngine.calculate(shifts as any, new Date(), energyCosts);
    const after = WorkloadEngine.calculateWithHypothetical(
      shifts as any,
      hyp,
      new Date(),
      energyCosts,
    );

    return { before, after };
  }

  private getEnergyCosts(workProfile: any): EnergyCosts {
    if (!workProfile) return DEFAULT_ENERGY_COSTS;
    return {
      diurno: workProfile.energyCostDiurno ?? DEFAULT_ENERGY_COSTS.diurno,
      noturno: workProfile.energyCostNoturno ?? DEFAULT_ENERGY_COSTS.noturno,
      h24: workProfile.energyCost24h ?? DEFAULT_ENERGY_COSTS.h24,
    };
  }
}
