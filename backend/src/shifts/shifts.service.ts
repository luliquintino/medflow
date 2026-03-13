import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkloadEngine, EnergyCosts, DEFAULT_ENERGY_COSTS } from './shifts.engine';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { CheckConflictsDto } from './dto/check-conflicts.dto';
import { QueryShiftHistoryDto } from './dto/query-shift-history.dto';
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

  async checkConflicts(userId: string, dto: CheckConflictsDto) {
    const startTime = new Date(dto.date);
    const endTime = new Date(startTime.getTime() + dto.hours * 60 * 60 * 1000);

    // Find overlapping shifts
    const whereOverlap: any = {
      userId,
      date: { lt: endTime },
      endDate: { gt: startTime },
      status: { not: 'CANCELLED' },
    };
    if (dto.excludeShiftId) {
      whereOverlap.id = { not: dto.excludeShiftId };
    }

    const overlapping = await this.prisma.shift.findMany({
      where: whereOverlap,
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    const overlaps = overlapping.map((s) => ({
      shiftId: s.id,
      location: s.hospital?.name || s.location,
      date: s.date.toISOString(),
      endDate: s.endDate.toISOString(),
      type: s.type,
    }));

    // Find adjacent shifts for rest time calculation
    const restWarnings: Array<{
      type: 'before' | 'after';
      gapHours: number;
      adjacentShiftLocation: string;
      adjacentShiftDate: string;
    }> = [];

    const MIN_REST_HOURS = 11;

    // Closest shift ending before this one starts
    const shiftBefore = await this.prisma.shift.findFirst({
      where: {
        userId,
        endDate: { lte: startTime },
        status: { not: 'CANCELLED' },
        ...(dto.excludeShiftId ? { id: { not: dto.excludeShiftId } } : {}),
      },
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { endDate: 'desc' },
    });

    if (shiftBefore) {
      const gapHours = (startTime.getTime() - shiftBefore.endDate.getTime()) / (1000 * 60 * 60);
      if (gapHours < MIN_REST_HOURS) {
        restWarnings.push({
          type: 'before',
          gapHours: Math.round(gapHours * 10) / 10,
          adjacentShiftLocation: shiftBefore.hospital?.name || shiftBefore.location,
          adjacentShiftDate: shiftBefore.endDate.toISOString(),
        });
      }
    }

    // Closest shift starting after this one ends
    const shiftAfter = await this.prisma.shift.findFirst({
      where: {
        userId,
        date: { gte: endTime },
        status: { not: 'CANCELLED' },
        ...(dto.excludeShiftId ? { id: { not: dto.excludeShiftId } } : {}),
      },
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    if (shiftAfter) {
      const gapHours = (shiftAfter.date.getTime() - endTime.getTime()) / (1000 * 60 * 60);
      if (gapHours < MIN_REST_HOURS) {
        restWarnings.push({
          type: 'after',
          gapHours: Math.round(gapHours * 10) / 10,
          adjacentShiftLocation: shiftAfter.hospital?.name || shiftAfter.location,
          adjacentShiftDate: shiftAfter.date.toISOString(),
        });
      }
    }

    return { overlaps, restWarnings };
  }

  async getHistory(userId: string, query: QueryShiftHistoryDto) {
    const now = new Date();
    const where: any = {
      userId,
      date: { lt: now },
      status: 'CONFIRMED',
      realized: { not: false },
    };

    if (query.month && query.year) {
      const month = parseInt(query.month, 10) - 1; // JS months are 0-indexed
      const year = parseInt(query.year, 10);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (query.year) {
      const year = parseInt(query.year, 10);
      where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }

    if (query.hospitalId) where.hospitalId = query.hospitalId;
    if (query.type) where.type = query.type;

    const shifts = await this.prisma.shift.findMany({
      where,
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    // Compute monthly summary
    const monthMap = new Map<string, { month: number; year: number; totalHours: number; totalRevenue: number; shiftCount: number }>();
    for (const s of shifts) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthMap.get(key) || { month: d.getMonth() + 1, year: d.getFullYear(), totalHours: 0, totalRevenue: 0, shiftCount: 0 };
      entry.totalHours += s.hours;
      entry.totalRevenue += s.value;
      entry.shiftCount += 1;
      monthMap.set(key, entry);
    }

    const monthlySummary = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return { shifts, monthlySummary };
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
