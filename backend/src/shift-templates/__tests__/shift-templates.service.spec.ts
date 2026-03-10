import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShiftTemplatesService } from '../shift-templates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

const mockHospitalsService = {
  findOne: jest.fn(),
};

describe('ShiftTemplatesService', () => {
  let service: ShiftTemplatesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftTemplatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HospitalsService, useValue: mockHospitalsService },
      ],
    }).compile();

    service = module.get<ShiftTemplatesService>(ShiftTemplatesService);
    prisma = mockPrismaService;
  });

  describe('create', () => {
    it('should create a shift template', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const dto = {
        name: 'Plantao diurno padrao',
        type: 'TWELVE_HOURS' as any,
        durationInHours: 12,
        defaultValue: 1400,
        isNightShift: false,
      };
      const expectedTemplate = { id: 'tpl-1', hospitalId, ...dto };

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.create.mockResolvedValue(expectedTemplate);

      const result = await service.create(userId, hospitalId, dto);

      expect(mockHospitalsService.findOne).toHaveBeenCalledWith(userId, hospitalId);
      expect(prisma.shiftTemplate.create).toHaveBeenCalledWith({
        data: {
          hospitalId,
          name: dto.name,
          type: dto.type,
          durationInHours: dto.durationInHours,
          defaultValue: dto.defaultValue,
          isNightShift: dto.isNightShift,
        },
      });
      expect(result).toEqual(expectedTemplate);
    });

    it('should throw NotFoundException if hospital not owned by user', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-999';
      const dto = {
        name: 'Template',
        type: 'TWELVE_HOURS' as any,
        durationInHours: 12,
        defaultValue: 1400,
        isNightShift: false,
      };

      mockHospitalsService.findOne.mockRejectedValue(
        new NotFoundException('Hospital nao encontrado.'),
      );

      await expect(service.create(userId, hospitalId, dto)).rejects.toThrow(NotFoundException);

      expect(prisma.shiftTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all templates for a hospital', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const templates = [
        { id: 'tpl-1', hospitalId, name: 'Template A' },
        { id: 'tpl-2', hospitalId, name: 'Template B' },
      ];

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll(userId, hospitalId);

      expect(mockHospitalsService.findOne).toHaveBeenCalledWith(userId, hospitalId);
      expect(prisma.shiftTemplate.findMany).toHaveBeenCalledWith({
        where: { hospitalId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(templates);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no templates exist', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, hospitalId);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if hospital not owned by user', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-999';

      mockHospitalsService.findOne.mockRejectedValue(
        new NotFoundException('Hospital nao encontrado.'),
      );

      await expect(service.findAll(userId, hospitalId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a single template', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const template = {
        id: 'tpl-1',
        hospitalId,
        name: 'Plantao diurno',
        type: 'TWELVE_HOURS',
        durationInHours: 12,
        defaultValue: 1400,
        isNightShift: false,
      };

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(template);

      const result = await service.findOne(userId, hospitalId, 'tpl-1');

      expect(mockHospitalsService.findOne).toHaveBeenCalledWith(userId, hospitalId);
      expect(prisma.shiftTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
      expect(result).toEqual(template);
    });

    it('should throw NotFoundException if template not found', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, hospitalId, 'tpl-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if template belongs to different hospital', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const template = {
        id: 'tpl-1',
        hospitalId: 'hosp-other',
        name: 'Template',
      };

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(template);

      await expect(service.findOne(userId, hospitalId, 'tpl-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const template = {
        id: 'tpl-1',
        hospitalId,
        name: 'Plantao diurno',
        durationInHours: 12,
        defaultValue: 1400,
        isNightShift: false,
      };
      const updateDto = { name: 'Plantao atualizado', defaultValue: 1600 };
      const updatedTemplate = { ...template, ...updateDto };

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(template);
      prisma.shiftTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.update(userId, hospitalId, 'tpl-1', updateDto);

      expect(prisma.shiftTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: updateDto,
      });
      expect(result).toEqual(updatedTemplate);
    });

    it('should throw NotFoundException if template does not exist during update', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.update(userId, hospitalId, 'tpl-999', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.shiftTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a template and return success message', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const template = {
        id: 'tpl-1',
        hospitalId,
        name: 'Plantao diurno',
      };

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(template);
      prisma.shiftTemplate.delete.mockResolvedValue(template);

      const result = await service.remove(userId, hospitalId, 'tpl-1');

      expect(prisma.shiftTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
      expect(result).toEqual({ message: 'Template removido com sucesso.' });
    });

    it('should throw NotFoundException if template does not exist during remove', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';

      mockHospitalsService.findOne.mockResolvedValue({
        id: hospitalId,
        userId,
      });
      prisma.shiftTemplate.findUnique.mockResolvedValue(null);

      await expect(service.remove(userId, hospitalId, 'tpl-999')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.shiftTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
