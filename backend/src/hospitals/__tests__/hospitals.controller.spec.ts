import { Test, TestingModule } from '@nestjs/testing';
import { HospitalsController } from '../hospitals.controller';
import { HospitalsService } from '../hospitals.service';

const mockHospitalsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('HospitalsController', () => {
  let controller: HospitalsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HospitalsController],
      providers: [{ provide: HospitalsService, useValue: mockHospitalsService }],
    }).compile();

    controller = module.get<HospitalsController>(HospitalsController);
  });

  // ─── CREATE ─────────────────────────────────────────

  describe('create', () => {
    it('should call hospitalsService.create with userId and dto', async () => {
      const userId = 'user-1';
      const dto = { name: 'Hospital ABC', address: 'Rua X, 123', city: 'Sao Paulo', state: 'SP' };
      const result = { id: 'hosp-1', ...dto };
      mockHospitalsService.create.mockResolvedValue(result);

      expect(await controller.create(userId, dto as any)).toEqual(result);
      expect(mockHospitalsService.create).toHaveBeenCalledWith(userId, dto);
    });
  });

  // ─── FIND ALL ───────────────────────────────────────

  describe('findAll', () => {
    it('should call hospitalsService.findAll with userId', async () => {
      const userId = 'user-1';
      const result = [{ id: 'hosp-1', name: 'Hospital ABC' }];
      mockHospitalsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(userId)).toEqual(result);
      expect(mockHospitalsService.findAll).toHaveBeenCalledWith(userId);
    });
  });

  // ─── FIND ONE ───────────────────────────────────────

  describe('findOne', () => {
    it('should call hospitalsService.findOne with userId and id', async () => {
      const userId = 'user-1';
      const id = 'hosp-1';
      const result = { id, name: 'Hospital ABC', templates: [] };
      mockHospitalsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(userId, id)).toEqual(result);
      expect(mockHospitalsService.findOne).toHaveBeenCalledWith(userId, id);
    });
  });

  // ─── UPDATE ─────────────────────────────────────────

  describe('update', () => {
    it('should call hospitalsService.update with userId, id, and dto', async () => {
      const userId = 'user-1';
      const id = 'hosp-1';
      const dto = { name: 'Hospital XYZ' };
      const result = { id, name: 'Hospital XYZ' };
      mockHospitalsService.update.mockResolvedValue(result);

      expect(await controller.update(userId, id, dto as any)).toEqual(result);
      expect(mockHospitalsService.update).toHaveBeenCalledWith(userId, id, dto);
    });
  });

  // ─── REMOVE ─────────────────────────────────────────

  describe('remove', () => {
    it('should call hospitalsService.remove with userId and id', async () => {
      const userId = 'user-1';
      const id = 'hosp-1';
      const result = { message: 'Hospital removed' };
      mockHospitalsService.remove.mockResolvedValue(result);

      expect(await controller.remove(userId, id)).toEqual(result);
      expect(mockHospitalsService.remove).toHaveBeenCalledWith(userId, id);
    });
  });
});
