import { ShiftsService } from '../shifts.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  shift: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  hospital: {
    findFirst: jest.fn(),
  },
  workProfile: {
    findUnique: jest.fn(),
  },
};

describe('ShiftsService - checkConflicts', () => {
  let service: ShiftsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ShiftsService(mockPrisma as unknown as PrismaService);
  });

  it('should return empty arrays when no overlaps and sufficient rest', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);
    mockPrisma.shift.findFirst.mockResolvedValue(null);

    const result = await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
    });

    expect(result.overlaps).toEqual([]);
    expect(result.restWarnings).toEqual([]);
  });

  it('should detect overlapping shifts', async () => {
    const overlapping = [{
      id: 'shift-1',
      location: 'Hospital A',
      date: new Date('2026-03-15T06:00:00.000Z'),
      endDate: new Date('2026-03-15T18:00:00.000Z'),
      type: 'TWELVE_DAY',
      hospital: { id: 'h1', name: 'Hospital A' },
    }];
    mockPrisma.shift.findMany.mockResolvedValue(overlapping);
    mockPrisma.shift.findFirst.mockResolvedValue(null);

    const result = await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
    });

    expect(result.overlaps).toHaveLength(1);
    expect(result.overlaps[0].location).toBe('Hospital A');
    expect(result.overlaps[0].shiftId).toBe('shift-1');
  });

  it('should warn when rest gap < 11h (before)', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);
    // Shift ending 6 hours before the proposed shift
    const shiftBefore = {
      id: 'shift-before',
      location: 'Hospital B',
      endDate: new Date('2026-03-15T02:00:00.000Z'),
      hospital: { id: 'h2', name: 'Hospital B' },
    };
    mockPrisma.shift.findFirst
      .mockResolvedValueOnce(shiftBefore)   // shiftBefore query
      .mockResolvedValueOnce(null);          // shiftAfter query

    const result = await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
    });

    expect(result.restWarnings).toHaveLength(1);
    expect(result.restWarnings[0].type).toBe('before');
    expect(result.restWarnings[0].gapHours).toBe(6);
    expect(result.restWarnings[0].adjacentShiftLocation).toBe('Hospital B');
  });

  it('should warn when rest gap < 11h (after)', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);
    // Shift starting 5 hours after the proposed shift ends
    const shiftAfter = {
      id: 'shift-after',
      location: 'Hospital C',
      date: new Date('2026-03-16T01:00:00.000Z'),
      hospital: { id: 'h3', name: 'Hospital C' },
    };
    mockPrisma.shift.findFirst
      .mockResolvedValueOnce(null)           // shiftBefore query
      .mockResolvedValueOnce(shiftAfter);    // shiftAfter query

    // Shift from 08:00 to 20:00 (12h), next shift at 01:00 = 5h gap
    const result = await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
    });

    expect(result.restWarnings).toHaveLength(1);
    expect(result.restWarnings[0].type).toBe('after');
    expect(result.restWarnings[0].gapHours).toBe(5);
  });

  it('should exclude shift being edited', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);
    mockPrisma.shift.findFirst.mockResolvedValue(null);

    await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
      excludeShiftId: 'shift-editing',
    });

    // Verify the excludeShiftId was passed to the query
    expect(mockPrisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'shift-editing' },
        }),
      }),
    );
  });

  it('should not warn when rest gap >= 11h', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);
    const shiftBefore = {
      id: 'shift-before',
      location: 'Hospital A',
      endDate: new Date('2026-03-14T20:00:00.000Z'), // 12h before 08:00
      hospital: { id: 'h1', name: 'Hospital A' },
    };
    mockPrisma.shift.findFirst
      .mockResolvedValueOnce(shiftBefore)
      .mockResolvedValueOnce(null);

    const result = await service.checkConflicts('user-1', {
      date: '2026-03-15T08:00:00.000Z',
      hours: 12,
    });

    expect(result.restWarnings).toHaveLength(0);
  });
});

describe('ShiftsService - getHistory', () => {
  let service: ShiftsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ShiftsService(mockPrisma as unknown as PrismaService);
  });

  it('should return past confirmed shifts with monthly summary', async () => {
    const shifts = [
      { id: 's1', date: new Date('2026-02-15'), hours: 12, value: 1500, hospital: { id: 'h1', name: 'Hosp A' } },
      { id: 's2', date: new Date('2026-02-20'), hours: 24, value: 3000, hospital: { id: 'h1', name: 'Hosp A' } },
      { id: 's3', date: new Date('2026-01-10'), hours: 12, value: 1500, hospital: { id: 'h2', name: 'Hosp B' } },
    ];
    mockPrisma.shift.findMany.mockResolvedValue(shifts);

    const result = await service.getHistory('user-1', {});

    expect(result.shifts).toHaveLength(3);
    expect(result.monthlySummary).toHaveLength(2);
    // Feb summary
    const feb = result.monthlySummary.find((m: any) => m.month === 2);
    expect(feb?.totalHours).toBe(36);
    expect(feb?.totalRevenue).toBe(4500);
    expect(feb?.shiftCount).toBe(2);
  });

  it('should filter by month and year', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);

    await service.getHistory('user-1', { month: '2', year: '2026' });

    expect(mockPrisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('should filter by hospitalId', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);

    await service.getHistory('user-1', { hospitalId: 'h1' });

    expect(mockPrisma.shift.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hospitalId: 'h1',
        }),
      }),
    );
  });

  it('should return empty arrays when no history', async () => {
    mockPrisma.shift.findMany.mockResolvedValue([]);

    const result = await service.getHistory('user-1', {});

    expect(result.shifts).toEqual([]);
    expect(result.monthlySummary).toEqual([]);
  });
});
