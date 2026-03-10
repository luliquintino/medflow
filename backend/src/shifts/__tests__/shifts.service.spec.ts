import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ShiftsService } from '../shifts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    prisma = mockPrismaService;
  });

  describe('create', () => {
    const userId = 'user-1';
    const baseDto = {
      date: '2026-03-15T07:00:00.000Z',
      type: 'TWELVE_HOURS' as const,
      hours: 12,
      value: 1500,
      location: 'Hospital A',
      status: 'CONFIRMED' as const,
    };

    it('should create a shift without hospital', async () => {
      const expectedShift = { id: 'shift-1', userId, ...baseDto };
      prisma.shift.create.mockResolvedValue(expectedShift);

      const result = await service.create(userId, baseDto);

      expect(prisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            hours: baseDto.hours,
          }),
        }),
      );
      expect(result).toEqual(expectedShift);
    });

    it('should create a shift with valid hospital', async () => {
      const dtoWithHospital = { ...baseDto, hospitalId: 'hosp-1' };
      const hospital = { id: 'hosp-1', userId, name: 'Hospital A' };
      const expectedShift = { id: 'shift-1', userId, ...dtoWithHospital };

      prisma.hospital.findFirst.mockResolvedValue(hospital);
      prisma.shift.create.mockResolvedValue(expectedShift);

      const result = await service.create(userId, dtoWithHospital);

      expect(prisma.hospital.findFirst).toHaveBeenCalledWith({
        where: { id: 'hosp-1', userId },
      });
      expect(prisma.shift.create).toHaveBeenCalled();
      expect(result).toEqual(expectedShift);
    });

    it('should throw NotFoundException if hospital not found or not owned', async () => {
      const dtoWithHospital = { ...baseDto, hospitalId: 'hosp-999' };
      prisma.hospital.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dtoWithHospital)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const userId = 'user-1';

    it('should return all shifts for user', async () => {
      const shifts = [
        { id: 'shift-1', userId, hours: 12 },
        { id: 'shift-2', userId, hours: 24 },
      ];
      prisma.shift.findMany.mockResolvedValue(shifts);

      const result = await service.findAll(userId, {});

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId }),
        }),
      );
      expect(result).toEqual(shifts);
    });

    it('should filter by date range', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      await service.findAll(userId, {
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
      });

      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const userId = 'user-1';

    it('should return shift', async () => {
      const shift = { id: 'shift-1', userId, hours: 12, location: 'Hospital A' };
      prisma.shift.findUnique.mockResolvedValue(shift);

      const result = await service.findOne(userId, 'shift-1');

      expect(result).toEqual(shift);
    });

    it('should throw NotFoundException if shift not found', async () => {
      prisma.shift.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, 'shift-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if shift belongs to another user', async () => {
      const shift = { id: 'shift-1', userId: 'other-user', hours: 12 };
      prisma.shift.findUnique.mockResolvedValue(shift);

      await expect(service.findOne(userId, 'shift-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update shift successfully', async () => {
      const userId = 'user-1';
      const shift = { id: 'shift-1', userId, hours: 12, location: 'Hospital A' };
      const updateDto = { hours: 24 };
      const updatedShift = { ...shift, ...updateDto };

      prisma.shift.findUnique.mockResolvedValue(shift);
      prisma.shift.update.mockResolvedValue(updatedShift);

      const result = await service.update(userId, 'shift-1', updateDto);

      expect(prisma.shift.findUnique).toHaveBeenCalled();
      expect(prisma.shift.update).toHaveBeenCalledWith({
        where: { id: 'shift-1' },
        data: updateDto,
        include: {
          hospital: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual(updatedShift);
    });
  });

  describe('remove', () => {
    it('should delete shift and return message', async () => {
      const userId = 'user-1';
      const shift = { id: 'shift-1', userId, hours: 12, location: 'Hospital A' };

      prisma.shift.findUnique.mockResolvedValue(shift);
      prisma.shift.delete.mockResolvedValue(shift);

      const result = await service.remove(userId, 'shift-1');

      expect(prisma.shift.findUnique).toHaveBeenCalled();
      expect(prisma.shift.delete).toHaveBeenCalledWith({
        where: { id: 'shift-1' },
      });
      expect(result).toBeDefined();
    });
  });
});
