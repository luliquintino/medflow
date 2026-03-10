import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsEngine } from '../analytics.engine';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

jest.spyOn(AnalyticsEngine, 'calculate');

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getAnalytics', () => {
    const mockShifts = [
      { date: new Date('2026-02-10'), value: 3000, hours: 12, type: 'TWELVE_HOURS', status: 'CONFIRMED', realized: true, hospitalId: 'h1' },
    ];
    const mockHospitals = [{ id: 'h1', name: 'Hospital A' }];

    beforeEach(() => {
      mockPrismaService.shift.findMany.mockResolvedValue(mockShifts);
      mockPrismaService.hospital.findMany.mockResolvedValue(mockHospitals);
      (AnalyticsEngine.calculate as jest.Mock).mockReturnValue({
        summary: { totalRevenue: 3000 },
        monthlyIncome: [],
        hospitalRanking: [],
        incomeByShiftType: [],
        monthOverMonthGrowth: [],
      });
    });

    it('should query shifts with correct where clause', async () => {
      await service.getAnalytics('user-1', 6);

      expect(mockPrismaService.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: 'CONFIRMED',
            realized: { not: false },
            date: { gte: expect.any(Date) },
          }),
          orderBy: { date: 'asc' },
        }),
      );
    });

    it('should query hospitals for the user', async () => {
      await service.getAnalytics('user-1', 6);

      expect(mockPrismaService.hospital.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          select: { id: true, name: true },
        }),
      );
    });

    it('should delegate to AnalyticsEngine.calculate with shifts, hospitals, and monthsBack', async () => {
      await service.getAnalytics('user-1', 6);

      expect(AnalyticsEngine.calculate).toHaveBeenCalledWith({
        shifts: mockShifts,
        hospitals: mockHospitals,
        monthsBack: 6,
      });
    });

    it('should compute correct cutoff for monthsBack=6', async () => {
      await service.getAnalytics('user-1', 6);

      const callArgs = mockPrismaService.shift.findMany.mock.calls[0][0];
      const cutoff: Date = callArgs.where.date.gte;

      const expected = new Date();
      expected.setMonth(expected.getMonth() - 6);
      expected.setDate(1);
      expected.setHours(0, 0, 0, 0);

      expect(cutoff.getTime()).toBe(expected.getTime());
    });

    it('should compute correct cutoff for monthsBack=12', async () => {
      await service.getAnalytics('user-1', 12);

      const callArgs = mockPrismaService.shift.findMany.mock.calls[0][0];
      const cutoff: Date = callArgs.where.date.gte;

      const expected = new Date();
      expected.setMonth(expected.getMonth() - 12);
      expected.setDate(1);
      expected.setHours(0, 0, 0, 0);

      expect(cutoff.getTime()).toBe(expected.getTime());
    });

    it('should return the result from AnalyticsEngine', async () => {
      const result = await service.getAnalytics('user-1', 6);

      expect(result).toEqual({ summary: { totalRevenue: 3000 }, monthlyIncome: [], hospitalRanking: [], incomeByShiftType: [], monthOverMonthGrowth: [] });
    });

    it('should handle empty shifts and hospitals', async () => {
      mockPrismaService.shift.findMany.mockResolvedValue([]);
      mockPrismaService.hospital.findMany.mockResolvedValue([]);

      await service.getAnalytics('user-1', 6);

      expect(AnalyticsEngine.calculate).toHaveBeenCalledWith({
        shifts: [],
        hospitals: [],
        monthsBack: 6,
      });
    });
  });
});
