import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvestmentEventsService } from './investment-events.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvestmentEventsService', () => {
  let service: InvestmentEventsService;

  const mockHolding = {
    id: 'holding-1',
    userId: 'user-1',
    containerId: 'container-1',
    accountId: 'account-1',
    name: 'Safaricom Stock',
    quantity: '100',
    costBasisTotal: '15000',
    currentValueTotal: '15000',
    status: 'OPEN',
    deletedAt: null,
  };

  const prismaMock = {
    container: { findFirst: jest.fn() },
    holding: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    transaction: { create: jest.fn() },
    investmentEvent: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn) => fn(prismaMock));

    // FIX: Mock the transaction creation to return an ID
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestmentEventsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<InvestmentEventsService>(InvestmentEventsService);
  });

  it('BUY: updates holding quantity and cost basis', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.holding.findFirst.mockResolvedValue(mockHolding);
    prismaMock.investmentEvent.findFirst.mockResolvedValue(null);
    prismaMock.holding.update.mockResolvedValue({
      ...mockHolding,
      quantity: '150',
      costBasisTotal: '25000',
      currentValueTotal: '25000',
    });
    prismaMock.investmentEvent.create.mockResolvedValue({ id: 'event-1', realizedGain: null });

    await service.create('user-1', {
      containerId: 'container-1',
      holdingId: 'holding-1',
      eventType: 'BUY',
      quantity: 50,
      totalAmount: 10000,
      currency: 'KES',
      date: '2026-11-14',
    });

    expect(prismaMock.holding.update).toHaveBeenCalledWith({
      where: { id: 'holding-1' },
      data: {
        quantity: 150,
        costBasisTotal: 25000,
        currentValueTotal: 25000,
      },
    });
    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(prismaMock.investmentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ realizedGain: null }),
      }),
    );
  });

  it('SELL: calculates realized gain correctly', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.holding.findFirst.mockResolvedValue(mockHolding);
    prismaMock.investmentEvent.findFirst.mockResolvedValue(null);
    prismaMock.holding.update.mockResolvedValue({
      ...mockHolding,
      quantity: '60',
      costBasisTotal: '9000',
      currentValueTotal: '7000',
    });
    prismaMock.investmentEvent.create.mockResolvedValue({ id: 'event-1', realizedGain: 2000 });

    await service.create('user-1', {
      containerId: 'container-1',
      holdingId: 'holding-1',
      eventType: 'SELL',
      quantity: 40,
      totalAmount: 8000,
      currency: 'KES',
      date: '2026-11-14',
    });

    expect(prismaMock.holding.update).toHaveBeenCalledWith({
      where: { id: 'holding-1' },
      data: {
        quantity: 60,
        costBasisTotal: 9000,
        currentValueTotal: 7000,
      },
    });
    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(prismaMock.investmentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ realizedGain: 2000 }),
      }),
    );
  });

  it('SELL: rejects if quantity exceeds available', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.holding.findFirst.mockResolvedValue({ ...mockHolding, quantity: '10' });

    await expect(
      service.create('user-1', {
        containerId: 'container-1',
        holdingId: 'holding-1',
        eventType: 'SELL',
        quantity: 50,
        totalAmount: 8000,
        currency: 'KES',
        date: '2026-11-14',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('SELL: closes holding when quantity reaches zero', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.holding.findFirst.mockResolvedValue(mockHolding);
    prismaMock.investmentEvent.findFirst.mockResolvedValue(null);
    prismaMock.holding.update.mockResolvedValue({ ...mockHolding, status: 'CLOSED' });
    prismaMock.investmentEvent.create.mockResolvedValue({ id: 'event-1', realizedGain: 2000 });

    await service.create('user-1', {
      containerId: 'container-1',
      holdingId: 'holding-1',
      eventType: 'SELL',
      quantity: 100,
      totalAmount: 20000,
      currency: 'KES',
      date: '2026-11-14',
    });

    expect(prismaMock.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CLOSED',
          closedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('DIVIDEND: records realized gain without changing quantity', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.holding.findFirst.mockResolvedValue(mockHolding);
    prismaMock.investmentEvent.findFirst.mockResolvedValue(null);
    prismaMock.investmentEvent.create.mockResolvedValue({ id: 'event-1', realizedGain: 500 });

    await service.create('user-1', {
      containerId: 'container-1',
      holdingId: 'holding-1',
      eventType: 'DIVIDEND',
      totalAmount: 500,
      currency: 'KES',
      date: '2026-11-14',
    });

    expect(prismaMock.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 100,
          costBasisTotal: 15000,
          currentValueTotal: 15000,
        }),
      }),
    );
    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(prismaMock.investmentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ realizedGain: 500 }),
      }),
    );
  });

  it('CONTRIBUTION: does not touch the holding', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.investmentEvent.findFirst.mockResolvedValue(null);
    prismaMock.investmentEvent.create.mockResolvedValue({ id: 'event-1', realizedGain: null });

    await service.create('user-1', {
      containerId: 'container-1',
      eventType: 'CONTRIBUTION',
      totalAmount: 10000,
      currency: 'KES',
      date: '2026-11-14',
    });

    expect(prismaMock.holding.update).not.toHaveBeenCalled();
    expect(prismaMock.investmentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ holdingId: null, realizedGain: null }),
      }),
    );
  });

  it('rejects events with invalid container', async () => {
    prismaMock.container.findFirst.mockResolvedValue(null);

    await expect(
      service.create('user-1', {
        containerId: 'bad-container',
        eventType: 'BUY',
        quantity: 10,
        totalAmount: 1000,
        currency: 'KES',
        date: '2026-11-14',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects events with date before last event', async () => {
    prismaMock.container.findFirst.mockResolvedValue({ id: 'container-1' });
    prismaMock.investmentEvent.findFirst.mockResolvedValue({
      id: 'past-event',
      date: new Date('2026-11-10'),
    });

    await expect(
      service.create('user-1', {
        containerId: 'container-1',
        eventType: 'CONTRIBUTION',
        totalAmount: 1000,
        currency: 'KES',
        date: '2026-11-05',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('remove: reverses a BUY event', async () => {
    prismaMock.investmentEvent.findFirst
      .mockResolvedValueOnce({
        id: 'event-1',
        holdingId: 'holding-1',
        eventType: 'BUY',
        quantity: '100',
        totalAmount: '15000',
        relatedTransactionId: 'tx-1',
        date: new Date('2026-11-14'),
      })
      .mockResolvedValueOnce({ id: 'event-1' });

    prismaMock.holding.findUnique.mockResolvedValue({
      ...mockHolding,
      quantity: '100',
      costBasisTotal: '15000',
      currentValueTotal: '15000',
    });
    prismaMock.investmentEvent.delete.mockResolvedValue({ id: 'event-1' });

    await service.remove('user-1', 'event-1');

    expect(prismaMock.holding.update).toHaveBeenCalledWith({
      where: { id: 'holding-1' },
      data: {
        quantity: 0,
        costBasisTotal: 0,
        currentValueTotal: 0,
      },
    });
    expect(prismaMock.investmentEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
  });

  it('remove: reverses a SELL and reopens closed holding', async () => {
    prismaMock.investmentEvent.findFirst
      .mockResolvedValueOnce({
        id: 'event-1',
        holdingId: 'holding-1',
        eventType: 'SELL',
        quantity: '40',
        totalAmount: '8000',
        realizedGain: '2000',
        relatedTransactionId: 'tx-1',
        date: new Date('2026-11-14'),
      })
      .mockResolvedValueOnce({ id: 'event-1' });

    prismaMock.holding.findUnique.mockResolvedValue({
      ...mockHolding,
      status: 'CLOSED',
      quantity: '60',
      costBasisTotal: '9000',
      currentValueTotal: '10000',
    });
    prismaMock.investmentEvent.delete.mockResolvedValue({ id: 'event-1' });

    await service.remove('user-1', 'event-1');

    expect(prismaMock.holding.update).toHaveBeenCalledWith({
      where: { id: 'holding-1' },
      data: {
        quantity: 100,
        costBasisTotal: 15000,
        currentValueTotal: 18000,
        status: 'OPEN',
        closedAt: null,
      },
    });
  });
});
