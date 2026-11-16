import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { HoldingsService } from './holdings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Holdings (Integration)', () => {
  let service: HoldingsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string; // NEW
  let holdingId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [HoldingsService, PrismaService],
    }).compile();

    service = module.get<HoldingsService>(HoldingsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `holdings-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Holdings Integration Test',
      },
    });

    containerId = randomUUID();
    await prisma.container.create({
      data: {
        id: containerId,
        userId: testUserId,
        type: 'INVESTMENT',
        name: 'Test Investments',
        currency: 'KES',
      },
    });

    // NEW: Create the investment account
    accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId: testUserId,
        containerId,
        name: 'Test Brokerage',
        category: 'ASSET',
        accountType: 'INVESTMENT_ACCOUNT',
        currency: 'KES',
      },
    });

    holdingId = randomUUID();
    await prisma.holding.create({
      data: {
        id: holdingId,
        userId: testUserId,
        containerId,
        accountId, // NEW
        name: 'Safaricom Stock',
        assetClass: 'STOCK',
        symbol: 'SCOM',
        quantity: 100,
        costBasisTotal: 15000,
        currentValueTotal: 18000,
        currency: 'KES',
        status: 'OPEN',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should create a holding and read it back from the database', async () => {
    const created = await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'Safaricom Stock',
      assetClass: 'STOCK',
      symbol: 'SCOM',
      quantity: 100,
      costBasisTotal: 15000,
      currentValueTotal: 18000,
      currency: 'KES',
    });

    const fetched = await service.findOne(testUserId, created.id);

    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Safaricom Stock');
    expect(fetched.symbol).toBe('SCOM');
    expect(fetched.assetClass).toBe('STOCK');
    expect(Number(fetched.quantity)).toBe(100);
  });

  it('should reject creating a holding in a non-INVESTMENT container', async () => {
    const personalContainerId = randomUUID();
    await prisma.container.create({
      data: {
        id: personalContainerId,
        userId: testUserId,
        type: 'PERSONAL',
        name: 'Test Personal',
        currency: 'KES',
      },
    });

    // NEW: Create an account in the personal container
    const personalAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: personalAccountId,
        userId: testUserId,
        containerId: personalContainerId,
        name: 'Personal Account',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
      },
    });

    await expect(
      service.create(testUserId, {
        containerId: personalContainerId,
        accountId: personalAccountId, // NEW
        name: 'Should Fail',
        assetClass: 'STOCK',
        quantity: 10,
        costBasisTotal: 1000,
        currentValueTotal: 1200,
        currency: 'KES',
      }),
    ).rejects.toThrow(BadRequestException);

    // Clean up
    await prisma.container.delete({ where: { id: personalContainerId } });
  });

  it('should compute correct summary from real holdings', async () => {
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'Safaricom Stock',
      assetClass: 'STOCK',
      quantity: 100,
      costBasisTotal: 10000,
      currentValueTotal: 12000,
      currency: 'KES',
    });

    await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'Bitcoin',
      assetClass: 'CRYPTO',
      quantity: 0.5,
      costBasisTotal: 5000,
      currentValueTotal: 6000,
      currency: 'KES',
    });

    await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'Kitengela Plot',
      assetClass: 'REAL_ESTATE',
      quantity: 1,
      costBasisTotal: 50000,
      currentValueTotal: 55000,
      currency: 'KES',
    });

    const summary = await service.getSummary(testUserId, {});

    expect(summary.count).toBe(3);
    expect(summary.totalCostBasis).toBe(65000);
    expect(summary.totalCurrentValue).toBe(73000);
    expect(summary.unrealizedGain).toBe(8000);
    expect(summary.byAssetClass).toEqual({
      STOCK: 1,
      CRYPTO: 1,
      REAL_ESTATE: 1,
    });
  });

  it('should soft-delete a holding so it no longer appears in findAll', async () => {
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    const holding = await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'To Be Deleted',
      assetClass: 'STOCK',
      quantity: 10,
      costBasisTotal: 1000,
      currentValueTotal: 1200,
      currency: 'KES',
    });

    const before = await service.findAll(testUserId, {});
    expect(before.length).toBe(1);
    expect(before[0]!.id).toBe(holding.id);

    await service.remove(testUserId, holding.id);

    const after = await service.findAll(testUserId, {});
    expect(after.length).toBe(0);

    const dbRow = await prisma.holding.findUnique({ where: { id: holding.id } });
    expect(dbRow).not.toBeNull();
    expect(dbRow?.deletedAt).not.toBeNull();
    expect(dbRow?.status).toBe('DELETED');
  });

  it('should reject findOne on a holding owned by a different user', async () => {
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    const holding = await service.create(testUserId, {
      containerId,
      accountId, // NEW
      name: 'Personal Secret',
      assetClass: 'STOCK',
      quantity: 1,
      costBasisTotal: 100,
      currentValueTotal: 120,
      currency: 'KES',
    });

    const otherUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: otherUserId,
        email: `holdings-other-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Other User',
      },
    });

    await expect(service.findOne(otherUserId, holding.id)).rejects.toThrow(NotFoundException);

    await prisma.user.delete({ where: { id: otherUserId } });
  });
});
