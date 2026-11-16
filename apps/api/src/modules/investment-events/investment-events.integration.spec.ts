import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { InvestmentEventsService } from './investment-events.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvestmentEvents (Integration)', () => {
  let service: InvestmentEventsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string;
  let holdingId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [InvestmentEventsService, PrismaService],
    }).compile();

    service = module.get<InvestmentEventsService>(InvestmentEventsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `investment-events-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Events Integration Test',
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
        accountId,
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

  it('should process a BUY event and update the holding', async () => {
    const event = await service.create(testUserId, {
      containerId,
      holdingId,
      eventType: 'BUY',
      quantity: 50,
      totalAmount: 10000,
      currency: 'KES',
      date: '2026-11-01',
    });

    expect(event.eventType).toBe('BUY');
    expect(event.realizedGain).toBeNull();

    const updatedHolding = await prisma.holding.findUnique({ where: { id: holdingId } });
    expect(Number(updatedHolding?.quantity)).toBe(150);
    expect(Number(updatedHolding?.costBasisTotal)).toBe(25000);
  });

  it('should process a SELL event, calculate realized gain, and update holding', async () => {
    const event = await service.create(testUserId, {
      containerId,
      holdingId,
      eventType: 'SELL',
      quantity: 50,
      totalAmount: 12000,
      currency: 'KES',
      date: '2026-11-02',
    });

    expect(Number(event.realizedGain)).toBeCloseTo(3666.67, 1);

    const updatedHolding = await prisma.holding.findUnique({ where: { id: holdingId } });
    expect(Number(updatedHolding?.quantity)).toBe(100);
    expect(Number(updatedHolding?.costBasisTotal)).toBeCloseTo(16666.67, 1);
  });

  it('should reject a SELL if quantity exceeds available', async () => {
    await expect(
      service.create(testUserId, {
        containerId,
        holdingId,
        eventType: 'SELL',
        quantity: 200,
        totalAmount: 50000,
        currency: 'KES',
        date: '2026-11-03',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle a DIVIDEND and record it as realized gain', async () => {
    const event = await service.create(testUserId, {
      containerId,
      holdingId,
      eventType: 'DIVIDEND',
      totalAmount: 500,
      currency: 'KES',
      date: '2026-11-04',
    });

    expect(event.eventType).toBe('DIVIDEND');
    expect(Number(event.realizedGain)).toBe(500);
  });

  // NEW TEST
  it('should create a linked transaction for a BUY event', async () => {
    // Clean slate
    await prisma.investmentEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });

    const beforeTxCount = await prisma.transaction.count({
      where: { userId: testUserId },
    });

    const event = await service.create(testUserId, {
      containerId,
      holdingId,
      eventType: 'BUY',
      quantity: 10,
      totalAmount: 2000,
      currency: 'KES',
      date: '2026-11-05',
    });

    // Verify the event has a linked transaction
    expect(event.relatedTransactionId).not.toBeNull();

    // Verify the transaction exists with the right shape
    const tx = await prisma.transaction.findUnique({
      where: { id: event.relatedTransactionId! },
    });

    expect(tx).not.toBeNull();
    expect(tx!.type).toBe('EXPENSE');
    expect(Number(tx!.amount)).toBe(2000);
    expect(tx!.accountId).toBe(accountId);
    expect(tx!.source).toBe('SYNCED');

    // Verify count increased by 1
    const afterTxCount = await prisma.transaction.count({
      where: { userId: testUserId },
    });
    expect(afterTxCount).toBe(beforeTxCount + 1);
  });

  it('should reverse a SELL event when deleted', async () => {
    const dividendEvent = await prisma.investmentEvent.findFirst({
      where: { userId: testUserId, eventType: 'DIVIDEND' },
    });
    await service.remove(testUserId, dividendEvent!.id);

    const sellEvent = await prisma.investmentEvent.findFirst({
      where: { userId: testUserId, eventType: 'SELL' },
    });

    expect(sellEvent).toBeDefined();
    await service.remove(testUserId, sellEvent!.id);

    const restoredHolding = await prisma.holding.findUnique({ where: { id: holdingId } });
    expect(Number(restoredHolding?.quantity)).toBe(150);
  });
});
