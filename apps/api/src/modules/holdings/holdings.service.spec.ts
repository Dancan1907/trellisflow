import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HoldingsService } from './holdings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('HoldingsService', () => {
  let service: HoldingsService;

  // A mock holding we reuse across tests
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

  // Mock Prisma — every method we use becomes a jest.fn()
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

  // ---------- CREATE ----------

  describe('create', () => {
    it('should throw NotFoundException if container does not exist', async () => {
      // HINT: prismaMock.container.findFirst.mockResolvedValue(null);
      // HINT: await expect(service.create('user-1', {...dto})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if container is not INVESTMENT type', async () => {
      // HINT: prismaMock.container.findFirst.mockResolvedValue({ type: 'PERSONAL' });
      // HINT: expect(...).rejects.toThrow(BadRequestException);
    });

    it('should create a holding successfully', async () => {
      // HINT: mock container.findFirst to return { type: 'INVESTMENT' }
      // HINT: mock holding.create to return mockHolding
      // HINT: expect(result).toEqual(mockHolding);
    });
  });

  // ---------- FIND ONE ----------

  describe('findOne', () => {
    it('should return a holding when found', async () => {
      // HINT: mock holding.findFirst to return mockHolding
      // HINT: expect(result).toEqual(mockHolding);
    });

    it('should throw NotFoundException when not found', async () => {
      // HINT: mock holding.findFirst to return null
      // HINT: expect(...).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- UPDATE ----------

  describe('update', () => {
    it('should update a holding after verifying ownership', async () => {
      // HINT: mock findFirst to return mockHolding (for findOne)
      // HINT: mock holding.update to return { ...mockHolding, name: 'Updated' }
      // HINT: expect(result.name).toBe('Updated');
    });
  });

  // ---------- REMOVE ----------

  describe('remove', () => {
    it('should soft-delete a holding', async () => {
      // HINT: mock findFirst to return mockHolding (for findOne)
      // HINT: mock holding.update to return { ...mockHolding, status: 'DELETED' }
      // HINT: expect(prismaMock.holding.update).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     data: expect.objectContaining({ status: 'DELETED' }),
      //   })
      // );
    });
  });

  // ---------- GET SUMMARY ----------

  describe('getSummary', () => {
    it('should compute correct totals across holdings', async () => {
      // HINT: mock holding.findMany to return an array with 2 holdings:
      //   [{ costBasisTotal: '10000', currentValueTotal: '12000', assetClass: 'STOCK' },
      //    { costBasisTotal: '5000', currentValueTotal: '6000', assetClass: 'CRYPTO' }]
      // HINT: expect(result).toEqual({
      //   count: 2,
      //   totalCostBasis: 15000,
      //   totalCurrentValue: 18000,
      //   unrealizedGain: 3000,
      //   byAssetClass: { STOCK: 1, CRYPTO: 1 },
      // });
    });
  });
});
