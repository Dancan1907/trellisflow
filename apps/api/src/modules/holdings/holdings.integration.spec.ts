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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [HoldingsService, PrismaService],
    }).compile();

    service = module.get<HoldingsService>(HoldingsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a real user in the test database
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `holdings-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Holdings Integration Test',
      },
    });

    // Create a real INVESTMENT container
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
  });

  afterAll(async () => {
    // Delete the user — cascades to containers, holdings, everything
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should create a holding and read it back from the database', async () => {
    // 1. Create a holding via the service
    const created = await service.create(testUserId, {
      containerId,
      name: 'Safaricom Stock',
      assetClass: 'STOCK',
      symbol: 'SCOM',
      quantity: 100,
      costBasisTotal: 15000,
      currentValueTotal: 18000,
      currency: 'KES',
    });

    // 2. Fetch it back via the service (proves it was persisted)
    const fetched = await service.findOne(testUserId, created.id);

    // Assert that it was saved in the db with all the right fields
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Safaricom Stock');
    expect(fetched.symbol).toBe('SCOM');
    expect(fetched.assetClass).toBe('STOCK');
    expect(Number(fetched.quantity)).toBe(100);
  });

  it('should reject creating a holding in a non-INVESTMENT container', async () => {
    // 1. Create a PERSONAL container inline
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

    // 2. Try to create a holding in it — expect BadRequestException
    await expect(
      service.create(testUserId, {
        containerId: personalContainerId,
        name: 'Should Fail',
        assetClass: 'STOCK',
        quantity: 10,
        costBasisTotal: 1000,
        currentValueTotal: 1200,
        currency: 'KES',
      }),
    ).rejects.toThrow(BadRequestException);

    // 3. Clean up the personal container
    await prisma.container.delete({ where: { id: personalContainerId } });
  });

  it('should compute correct summary from real holdings', async () => {
    // Clean slate for this test
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    // 1. Create 3 holdings with different asset classes
    await service.create(testUserId, {
      containerId,
      name: 'Safaricom Stock',
      assetClass: 'STOCK',
      quantity: 100,
      costBasisTotal: 10000,
      currentValueTotal: 12000,
      currency: 'KES',
    });

    await service.create(testUserId, {
      containerId,
      name: 'Bitcoin',
      assetClass: 'CRYPTO',
      quantity: 0.5,
      costBasisTotal: 5000,
      currentValueTotal: 6000,
      currency: 'KES',
    });

    await service.create(testUserId, {
      containerId,
      name: 'Kitengela Plot',
      assetClass: 'REAL_ESTATE',
      quantity: 1,
      costBasisTotal: 50000,
      currentValueTotal: 55000,
      currency: 'KES',
    });

    // 2. Call getSummary
    const summary = await service.getSummary(testUserId, {});

    // 3. Assert the math
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
    // Clean slate
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    // 1. Create a holding
    const holding = await service.create(testUserId, {
      containerId,
      name: 'To Be Deleted',
      assetClass: 'STOCK',
      quantity: 10,
      costBasisTotal: 1000,
      currentValueTotal: 1200,
      currency: 'KES',
    });

    // 2. Find all — should appear
    const before = await service.findAll(testUserId, {});
    expect(before.length).toBe(1);
    expect(before[0].id).toBe(holding.id);

    // 3. Soft-delete
    await service.remove(testUserId, holding.id);

    // 4. Find all — should NOT appear
    const after = await service.findAll(testUserId, {});
    expect(after.length).toBe(0);

    // 5. Verify in DB directly — row exists, but deletedAt is set
    const dbRow = await prisma.holding.findUnique({ where: { id: holding.id } });
    expect(dbRow).not.toBeNull();
    expect(dbRow?.deletedAt).not.toBeNull();
    expect(dbRow?.status).toBe('DELETED');
  });

  it('should reject findOne on a holding owned by a different user', async () => {
    // Clean slate
    await prisma.holding.deleteMany({ where: { userId: testUserId } });

    // 1. Create a holding owned by testUserId
    const holding = await service.create(testUserId, {
      containerId,
      name: 'Personal Secret',
      assetClass: 'STOCK',
      quantity: 1,
      costBasisTotal: 100,
      currentValueTotal: 120,
      currency: 'KES',
    });

    // 2. Create a second user
    const otherUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: otherUserId,
        email: `holdings-other-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Other User',
      },
    });

    // 3. Try to access testUserId's holding as otherUserId
    await expect(service.findOne(otherUserId, holding.id)).rejects.toThrow(NotFoundException);

    // 4. Clean up the second user
    await prisma.user.delete({ where: { id: otherUserId } });
  });
});
