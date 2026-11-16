import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HoldingsService } from './holdings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('HoldingsService', () => {
  let service: HoldingsService;

  const mockHolding = {
    id: 'holding-1',
    userId: 'user-1',
    containerId: 'container-1',
    accountId: 'account-1',
    name: 'Safaricom Stock',
    assetClass: 'STOCK',
    symbol: 'SCOM',
    quantity: '100',
    costBasisTotal: '15000',
    currentValueTotal: '15000',
    currency: 'KES',
    pricingMode: 'MANUAL',
    status: 'OPEN',
    deletedAt: null,
  };

  const prismaMock = {
    container: {
      findFirst: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    holding: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    netWorthSnapshot: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HoldingsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<HoldingsService>(HoldingsService);
  });

  describe('create', () => {
    it('should throw NotFoundException if container does not exist', async () => {
      prismaMock.container.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          containerId: 'missing-container',
          accountId: 'account-1',
          name: 'Test Holding',
          assetClass: 'STOCK',
          quantity: 100,
          costBasisTotal: 15000,
          currentValueTotal: 18000,
          currency: 'KES',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if container is not INVESTMENT type', async () => {
      prismaMock.container.findFirst.mockResolvedValue({
        type: 'PERSONAL',
      });

      prismaMock.account.findFirst.mockResolvedValue({
        id: 'account-1',
      });

      await expect(
        service.create('user-1', {
          containerId: 'personal-container',
          accountId: 'account-1',
          name: 'Test Holding',
          assetClass: 'STOCK',
          quantity: 100,
          costBasisTotal: 15000,
          currentValueTotal: 18000,
          currency: 'KES',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a holding successfully', async () => {
      prismaMock.container.findFirst.mockResolvedValue({
        id: 'container-1',
        type: 'INVESTMENT',
        currency: 'KES',
      });

      prismaMock.account.findFirst.mockResolvedValue({
        id: 'account-1',
        containerId: 'container-1',
        userId: 'user-1',
      });

      prismaMock.holding.create.mockResolvedValue(mockHolding);

      const result = await service.create('user-1', {
        containerId: 'container-1',
        accountId: 'account-1',
        name: 'Test Holding',
        assetClass: 'STOCK',
        quantity: 100,
        costBasisTotal: 15000,
        currentValueTotal: 18000,
        currency: 'KES',
      });

      expect(result).toEqual(mockHolding);

      expect(prismaMock.holding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: 'OPEN',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a holding when found', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(mockHolding);

      const result = await service.findOne('user-1', 'holding-1');

      expect(result).toEqual(mockHolding);

      expect(prismaMock.holding.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'holding-1',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'holding-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a holding after verifying ownership', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(mockHolding);

      prismaMock.holding.update.mockResolvedValue({
        ...mockHolding,
        name: 'Updated',
      });

      const result = await service.update('user-1', 'holding-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
      expect(prismaMock.holding.findFirst).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a holding', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(mockHolding);

      prismaMock.holding.update.mockResolvedValue({
        ...mockHolding,
        status: 'DELETED',
      });

      const result = await service.remove('user-1', 'holding-1');

      expect(result.status).toBe('DELETED');

      expect(prismaMock.holding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELETED',
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getSummary', () => {
    it('should compute correct totals across holdings', async () => {
      prismaMock.holding.findMany.mockResolvedValue([
        {
          costBasisTotal: '10000',
          currentValueTotal: '12000',
          assetClass: 'STOCK',
        },
        {
          costBasisTotal: '5000',
          currentValueTotal: '6000',
          assetClass: 'CRYPTO',
        },
      ]);

      const result = await service.getSummary('user-1', {});

      expect(result).toEqual({
        count: 2,
        totalCostBasis: 15000,
        totalCurrentValue: 18000,
        unrealizedGain: 3000,
        byAssetClass: {
          STOCK: 1,
          CRYPTO: 1,
        },
      });
    });
  });

  describe('getAllocation', () => {
    it('should compute correct allocation breakdown', async () => {
      prismaMock.holding.findMany.mockResolvedValue([
        {
          currentValueTotal: '12000',
          assetClass: 'STOCK',
          currency: 'KES',
        },
        {
          currentValueTotal: '6000',
          assetClass: 'CRYPTO',
          currency: 'KES',
        },
        {
          currentValueTotal: '55000',
          assetClass: 'REAL_ESTATE',
          currency: 'KES',
        },
      ]);

      const result = await service.getAllocation('user-1', {});

      expect(result.totalValue).toBe(73000);
      expect(result.currency).toBe('KES');
      expect(result.breakdown).toHaveLength(3);

      expect(result.breakdown[0]).toEqual({
        assetClass: 'REAL_ESTATE',
        value: 55000,
        percentage: 75.3,
        count: 1,
      });

      expect(result.breakdown[1]).toEqual({
        assetClass: 'STOCK',
        value: 12000,
        percentage: 16.4,
        count: 1,
      });

      expect(result.breakdown[2]).toEqual({
        assetClass: 'CRYPTO',
        value: 6000,
        percentage: 8.2,
        count: 1,
      });
    });

    it('should handle empty portfolio', async () => {
      prismaMock.holding.findMany.mockResolvedValue([]);

      const result = await service.getAllocation('user-1', {});

      expect(result.totalValue).toBe(0);
      expect(result.breakdown).toEqual([]);
    });
  });

  describe('getPerformance', () => {
    it('should return performance snapshots mapped to the right shape', async () => {
      prismaMock.netWorthSnapshot.findMany.mockResolvedValue([
        {
          date: new Date('2026-10-01'),
          investmentsNetWorth: '50000',
          totalNetWorth: '100000',
        },
        {
          date: new Date('2026-10-02'),
          investmentsNetWorth: '52000',
          totalNetWorth: '102000',
        },
      ]);

      const result = await service.getPerformance('user-1', 30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2026-10-01',
        investmentsValue: 50000,
        totalValue: 100000,
      });
      expect(result[1]).toEqual({
        date: '2026-10-02',
        investmentsValue: 52000,
        totalValue: 102000,
      });
    });

    it('should reject days outside the 1-365 range', async () => {
      await expect(service.getPerformance('user-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.getPerformance('user-1', 400)).rejects.toThrow(BadRequestException);
    });

    it('should return an empty array when no snapshots exist', async () => {
      prismaMock.netWorthSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getPerformance('user-1', 30);
      expect(result).toEqual([]);
    });
  });
});
