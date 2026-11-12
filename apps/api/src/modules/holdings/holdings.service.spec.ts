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
    name: 'Safaricom Stock',
    assetClass: 'STOCK',
    symbol: 'SCOM',
    quantity: '100',
    costBasisTotal: '15000',
    currentValueTotal: '18000',
    currency: 'KES',
    pricingMode: 'MANUAL',
    status: 'OPEN',
    deletedAt: null,
  };

  const prismaMock = {
    container: {
      findFirst: jest.fn(),
    },
    holding: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HoldingsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<HoldingsService>(HoldingsService);
  });

  // ============================================================
  // CREATE
  // ============================================================
  describe('create', () => {
    it('should throw NotFoundException if container does not exist', async () => {
      // 1. Mock Prisma to return null (no container found)
      prismaMock.container.findFirst.mockResolvedValue(null);

      // 2. Call service.create — expect it to throw
      await expect(
        service.create('user-1', {
          containerId: 'missing-container',
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
      // 1. Mock Prisma to return container (of type: 'PERSONAL')
      prismaMock.container.findFirst.mockResolvedValue({ type: 'PERSONAL' });

      // 2. Expect create to throw BadRequestException
      await expect(
        service.create('user-1', {
          containerId: 'personal-container',
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
      // 1. Mock container exists and is INVESTMENT
      prismaMock.container.findFirst.mockResolvedValue({
        id: 'container-1',
        type: 'INVESTMENT',
        currency: 'KES',
      });

      // 2. Mock the created holding
      prismaMock.holding.create.mockResolvedValue(mockHolding);

      // 3. Call the service
      const result = await service.create('user-1', {
        containerId: 'container-1',
        name: 'Test Holding',
        assetClass: 'STOCK',
        quantity: 100,
        costBasisTotal: 15000,
        currentValueTotal: 18000,
        currency: 'KES',
      });

      // 4. Assert the result matches the mocked holding
      expect(result).toEqual(mockHolding);

      // 5. Verify the service actually tried to save the holding with the right data
      expect(prismaMock.holding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: 'OPEN', // Business rule: new holdings start as OPEN
          }),
        }),
      );
    });
  });

  // ============================================================
  // FIND ONE
  // ============================================================
  describe('findOne', () => {
    it('should return a holding when found', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(mockHolding);

      const result = await service.findOne('user-1', 'holding-1');

      expect(result).toEqual(mockHolding);

      // Verify security: the query MUST include userId to prevent cross-user access
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

  // ============================================================
  // UPDATE
  // ============================================================
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

      // Verify the ownership check happened first
      expect(prismaMock.holding.findFirst).toHaveBeenCalled();
    });
  });

  // ============================================================
  // REMOVE
  // ============================================================
  describe('remove', () => {
    it('should soft-delete a holding', async () => {
      prismaMock.holding.findFirst.mockResolvedValue(mockHolding);
      prismaMock.holding.update.mockResolvedValue({
        ...mockHolding,
        status: 'DELETED',
      });

      const result = await service.remove('user-1', 'holding-1');

      expect(result.status).toBe('DELETED');

      // Verify the service actually set the correct fields for soft delete
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

  // ============================================================
  // GET SUMMARY
  // ============================================================
  describe('getSummary', () => {
    it('should compute correct totals across holdings', async () => {
      prismaMock.holding.findMany.mockResolvedValue([
        { costBasisTotal: '10000', currentValueTotal: '12000', assetClass: 'STOCK' },
        { costBasisTotal: '5000', currentValueTotal: '6000', assetClass: 'CRYPTO' },
      ]);

      const result = await service.getSummary('user-1', {});

      expect(result).toEqual({
        count: 2,
        totalCostBasis: 15000,
        totalCurrentValue: 18000,
        unrealizedGain: 3000,
        byAssetClass: { STOCK: 1, CRYPTO: 1 },
      });
    });
  });
});
