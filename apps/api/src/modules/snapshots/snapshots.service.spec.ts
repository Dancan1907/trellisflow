import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsService } from './snapshots.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  container: { findMany: jest.fn() },
  netWorthSnapshot: { upsert: jest.fn() },
  user: { findMany: jest.fn() },
};

describe('SnapshotsService (Unit)', () => {
  let service: SnapshotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SnapshotsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SnapshotsService>(SnapshotsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('computeAndSaveForUser', () => {
    it('should correctly sum personal assets and liabilities', async () => {
      // Mock one Personal container with 2 accounts
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'c1',
          type: 'PERSONAL',
          accounts: [
            { currentBalance: 1000, category: 'ASSET' },
            { currentBalance: 200, category: 'LIABILITY' },
          ],
          summaries: [],
        },
      ]);
      mockPrisma.netWorthSnapshot.upsert.mockResolvedValue({ id: 'snap1' });

      await service.computeAndSaveForUser('u1');

      // Verify the math (1000 - 200 = 800)
      expect(mockPrisma.netWorthSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            personalNetWorth: 800,
            totalNetWorth: 800,
          }),
        }),
      );
    });

    it('should correctly calculate external business net worth from latest summary', async () => {
      // Mock one External Business
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'c1',
          type: 'EXTERNAL_BUSINESS',
          accounts: [],
          summaries: [
            { assetsValue: 50000, liabilitiesValue: 10000 }, // Latest summary
          ],
        },
      ]);
      mockPrisma.netWorthSnapshot.upsert.mockResolvedValue({ id: 'snap1' });

      await service.computeAndSaveForUser('u1');

      // Verify the math (50000 - 10000 = 40000)
      expect(mockPrisma.netWorthSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            businessesNetWorth: 40000,
            totalNetWorth: 40000,
          }),
        }),
      );
    });

    it('should handle empty containers without crashing', async () => {
      mockPrisma.container.findMany.mockResolvedValue([]);
      mockPrisma.netWorthSnapshot.upsert.mockResolvedValue({ id: 'snap1' });

      await service.computeAndSaveForUser('u1');

      expect(mockPrisma.netWorthSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            totalNetWorth: 0,
          }),
        }),
      );
    });
  });
});
