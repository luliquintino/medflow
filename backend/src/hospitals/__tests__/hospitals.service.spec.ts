import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HospitalsService } from '../hospitals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('HospitalsService', () => {
  let service: HospitalsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HospitalsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<HospitalsService>(HospitalsService);
    prisma = mockPrismaService;
  });

  describe('create', () => {
    it('should create a hospital', async () => {
      const userId = 'user-1';
      const dto = {
        name: 'Hospital Central',
        address: 'Rua Principal, 100',
        paymentDay: 15,
      };
      const expectedHospital = { id: 'hosp-1', userId, ...dto };

      prisma.hospital.create.mockResolvedValue(expectedHospital);

      const result = await service.create(userId, dto);

      expect(prisma.hospital.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          name: dto.name,
        }),
      });
      expect(result).toEqual(expectedHospital);
    });
  });

  describe('findAll', () => {
    it('should return all hospitals for user', async () => {
      const userId = 'user-1';
      const hospitals = [
        { id: 'hosp-1', userId, name: 'Hospital A' },
        { id: 'hosp-2', userId, name: 'Hospital B' },
      ];

      prisma.hospital.findMany.mockResolvedValue(hospitals);

      const result = await service.findAll(userId);

      expect(prisma.hospital.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
      expect(result).toEqual(hospitals);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return hospital', async () => {
      const userId = 'user-1';
      const hospital = {
        id: 'hosp-1',
        userId,
        name: 'Hospital Central',
        address: 'Rua Principal, 100',
        paymentDay: 15,
      };

      prisma.hospital.findUnique.mockResolvedValue(hospital);

      const result = await service.findOne(userId, 'hosp-1');

      expect(prisma.hospital.findUnique).toHaveBeenCalledWith({
        where: { id: 'hosp-1' },
        include: { templates: true },
      });
      expect(result).toEqual(hospital);
    });

    it('should throw NotFoundException if not found', async () => {
      const userId = 'user-1';

      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, 'hosp-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update hospital', async () => {
      const userId = 'user-1';
      const hospital = {
        id: 'hosp-1',
        userId,
        name: 'Hospital Central',
        address: 'Rua Principal, 100',
        paymentDay: 15,
      };
      const updateDto = { name: 'Hospital Central Updated', paymentDay: 20 };
      const updatedHospital = { ...hospital, ...updateDto };

      prisma.hospital.findUnique.mockResolvedValue(hospital);
      prisma.hospital.update.mockResolvedValue(updatedHospital);

      const result = await service.update(userId, 'hosp-1', updateDto);

      expect(prisma.hospital.findUnique).toHaveBeenCalledWith({
        where: { id: 'hosp-1' },
        include: { templates: true },
      });
      expect(prisma.hospital.update).toHaveBeenCalledWith({
        where: { id: 'hosp-1' },
        data: updateDto,
      });
      expect(result).toEqual(updatedHospital);
    });
  });

  describe('remove', () => {
    it('should delete hospital', async () => {
      const userId = 'user-1';
      const hospital = {
        id: 'hosp-1',
        userId,
        name: 'Hospital Central',
      };

      prisma.hospital.findUnique.mockResolvedValue(hospital);
      prisma.hospital.delete.mockResolvedValue(hospital);

      const result = await service.remove(userId, 'hosp-1');

      expect(prisma.hospital.findUnique).toHaveBeenCalledWith({
        where: { id: 'hosp-1' },
        include: { templates: true },
      });
      expect(prisma.hospital.delete).toHaveBeenCalledWith({
        where: { id: 'hosp-1' },
      });
      expect(result).toBeDefined();
    });
  });
});
