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

    holdingId = randomUUID();
    await prisma.holding.create({
      data: {
        id: holdingId,
        userId: testUserId,
        containerId,
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
      date: '2026-11-01', // Fixed date, earliest
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
      date: '2026-11-02', // Fixed date, day after BUY
    });

    // Average cost per share: 25,000 / 150 = 166.67
    // Cost basis removed: 50 * 166.67 = 8,333.50
    // Realized gain: 12,000 - 8,333.50 = 3,666.50
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
        date: '2026-11-03', // Fixed date
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
      date: '2026-11-04', // Fixed date, after SELL
    });

    expect(event.eventType).toBe('DIVIDEND');
    expect(Number(event.realizedGain)).toBe(500);
  });

  it('should reverse a SELL event when deleted', async () => {
    // Delete the DIVIDEND first (it's the newest)
    const dividendEvent = await prisma.investmentEvent.findFirst({
      where: { userId: testUserId, eventType: 'DIVIDEND' },
    });
    await service.remove(testUserId, dividendEvent!.id);

    // Now the SELL is the newest
    const sellEvent = await prisma.investmentEvent.findFirst({
      where: { userId: testUserId, eventType: 'SELL' },
    });

    expect(sellEvent).toBeDefined();
    await service.remove(testUserId, sellEvent!.id);

    // Verify the holding is restored to the post-BUY state
    const restoredHolding = await prisma.holding.findUnique({ where: { id: holdingId } });
    expect(Number(restoredHolding?.quantity)).toBe(150);
  });
});
