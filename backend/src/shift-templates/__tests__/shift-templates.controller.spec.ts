import { Test, TestingModule } from '@nestjs/testing';
import { ShiftTemplatesController } from '../shift-templates.controller';
import { ShiftTemplatesService } from '../shift-templates.service';

const mockShiftTemplatesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ShiftTemplatesController', () => {
  let controller: ShiftTemplatesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftTemplatesController],
      providers: [{ provide: ShiftTemplatesService, useValue: mockShiftTemplatesService }],
    }).compile();

    controller = module.get<ShiftTemplatesController>(ShiftTemplatesController);
  });

  // ─── CREATE ─────────────────────────────────────────

  describe('create', () => {
    it('should call shiftTemplatesService.create with userId, hospitalId, and dto', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const dto = { name: 'Night Shift', type: 'PLANTAO_12', hours: 12, value: 3000 };
      const result = { id: 'tmpl-1', ...dto };
      mockShiftTemplatesService.create.mockResolvedValue(result);

      expect(await controller.create(userId, hospitalId, dto as any)).toEqual(result);
      expect(mockShiftTemplatesService.create).toHaveBeenCalledWith(userId, hospitalId, dto);
    });
  });

  // ─── FIND ALL ───────────────────────────────────────

  describe('findAll', () => {
    it('should call shiftTemplatesService.findAll with userId and hospitalId', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const result = [{ id: 'tmpl-1', name: 'Night Shift' }];
      mockShiftTemplatesService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(userId, hospitalId)).toEqual(result);
      expect(mockShiftTemplatesService.findAll).toHaveBeenCalledWith(userId, hospitalId);
    });
  });

  // ─── FIND ONE ───────────────────────────────────────

  describe('findOne', () => {
    it('should call shiftTemplatesService.findOne with userId, hospitalId, and id', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const id = 'tmpl-1';
      const result = { id, name: 'Night Shift' };
      mockShiftTemplatesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(userId, hospitalId, id)).toEqual(result);
      expect(mockShiftTemplatesService.findOne).toHaveBeenCalledWith(userId, hospitalId, id);
    });
  });

  // ─── UPDATE ─────────────────────────────────────────

  describe('update', () => {
    it('should call shiftTemplatesService.update with userId, hospitalId, id, and dto', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const id = 'tmpl-1';
      const dto = { value: 3500 };
      const result = { id, value: 3500 };
      mockShiftTemplatesService.update.mockResolvedValue(result);

      expect(await controller.update(userId, hospitalId, id, dto as any)).toEqual(result);
      expect(mockShiftTemplatesService.update).toHaveBeenCalledWith(userId, hospitalId, id, dto);
    });
  });

  // ─── REMOVE ─────────────────────────────────────────

  describe('remove', () => {
    it('should call shiftTemplatesService.remove with userId, hospitalId, and id', async () => {
      const userId = 'user-1';
      const hospitalId = 'hosp-1';
      const id = 'tmpl-1';
      const result = { message: 'Template removed' };
      mockShiftTemplatesService.remove.mockResolvedValue(result);

      expect(await controller.remove(userId, hospitalId, id)).toEqual(result);
      expect(mockShiftTemplatesService.remove).toHaveBeenCalledWith(userId, hospitalId, id);
    });
  });
});
