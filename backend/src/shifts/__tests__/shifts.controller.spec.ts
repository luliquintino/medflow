import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from '../shifts.controller';
import { ShiftsService } from '../shifts.service';

const mockShiftsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getWorkloadSummary: jest.fn(),
  simulateWorkload: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ShiftsController', () => {
  let controller: ShiftsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [{ provide: ShiftsService, useValue: mockShiftsService }],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
  });

  // ─── CREATE ─────────────────────────────────────────

  describe('create', () => {
    it('should call shiftsService.create with userId and dto', async () => {
      const userId = 'user-1';
      const dto = {
        date: '2026-04-01',
        type: 'PLANTAO_12',
        hours: 12,
        value: 3000,
        hospitalId: 'hosp-1',
      };
      const result = { id: 'shift-1', ...dto };
      mockShiftsService.create.mockResolvedValue(result);

      expect(await controller.create(userId, dto as any)).toEqual(result);
      expect(mockShiftsService.create).toHaveBeenCalledWith(userId, dto);
    });
  });

  // ─── FIND ALL ───────────────────────────────────────

  describe('findAll', () => {
    it('should call shiftsService.findAll with userId and query', async () => {
      const userId = 'user-1';
      const query = { month: 3, year: 2026 };
      const result = [{ id: 'shift-1' }, { id: 'shift-2' }];
      mockShiftsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(userId, query as any)).toEqual(result);
      expect(mockShiftsService.findAll).toHaveBeenCalledWith(userId, query);
    });
  });

  // ─── GET WORKLOAD ──────────────────────────────────

  describe('getWorkload', () => {
    it('should call shiftsService.getWorkloadSummary with userId', async () => {
      const userId = 'user-1';
      const result = { totalHours: 120, weeklyAverage: 30 };
      mockShiftsService.getWorkloadSummary.mockResolvedValue(result);

      expect(await controller.getWorkload(userId)).toEqual(result);
      expect(mockShiftsService.getWorkloadSummary).toHaveBeenCalledWith(userId);
    });
  });

  // ─── SIMULATE WORKLOAD ─────────────────────────────

  describe('simulateWorkload', () => {
    it('should call shiftsService.simulateWorkload with userId and body', async () => {
      const userId = 'user-1';
      const body = { date: '2026-04-01', type: 'PLANTAO_12' as any, hours: 12, value: 3000 };
      const result = { currentHours: 120, projectedHours: 132 };
      mockShiftsService.simulateWorkload.mockResolvedValue(result);

      expect(await controller.simulateWorkload(userId, body)).toEqual(result);
      expect(mockShiftsService.simulateWorkload).toHaveBeenCalledWith(userId, body);
    });
  });

  // ─── FIND ONE ───────────────────────────────────────

  describe('findOne', () => {
    it('should call shiftsService.findOne with userId and id', async () => {
      const userId = 'user-1';
      const id = 'shift-1';
      const result = { id, date: '2026-04-01' };
      mockShiftsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(userId, id)).toEqual(result);
      expect(mockShiftsService.findOne).toHaveBeenCalledWith(userId, id);
    });
  });

  // ─── UPDATE ─────────────────────────────────────────

  describe('update', () => {
    it('should call shiftsService.update with userId, id, and dto', async () => {
      const userId = 'user-1';
      const id = 'shift-1';
      const dto = { value: 3500 };
      const result = { id, value: 3500 };
      mockShiftsService.update.mockResolvedValue(result);

      expect(await controller.update(userId, id, dto as any)).toEqual(result);
      expect(mockShiftsService.update).toHaveBeenCalledWith(userId, id, dto);
    });
  });

  // ─── REMOVE ─────────────────────────────────────────

  describe('remove', () => {
    it('should call shiftsService.remove with userId and id', async () => {
      const userId = 'user-1';
      const id = 'shift-1';
      const result = { message: 'Shift removed' };
      mockShiftsService.remove.mockResolvedValue(result);

      expect(await controller.remove(userId, id)).toEqual(result);
      expect(mockShiftsService.remove).toHaveBeenCalledWith(userId, id);
    });
  });
});
