import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockTx = {
  container: { update: jest.fn() },
  externalBusinessSource: { create: jest.fn() },
  account: { updateMany: jest.fn() },
  summary: { create: jest.fn() },
  insight: { updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockPrisma: any = {
  container: { findFirst: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockTx)),
};

describe('BusinessesService.convertToExternal', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(BusinessesService);
  });

  const internalBusiness = {
    id: 'biz-1',
    userId: 'u1',
    type: 'INTERNAL_BUSINESS',
    name: 'Farm',
    currency: 'KES',
    status: 'ACTIVE',
    accounts: [
      { category: 'ASSET', currentBalance: '60000', currency: 'KES' },
      { category: 'ASSET', currentBalance: '40000', currency: 'KES' },
      { category: 'LIABILITY', currentBalance: '25000', currency: 'KES' },
    ],
  };

  it('throws NotFound for unknown / unowned business', async () => {
    mockPrisma.container.findFirst.mockResolvedValue(null);
    await expect(service.convertToExternal('u1', 'biz-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects converting an already-external business', async () => {
    mockPrisma.container.findFirst.mockResolvedValue({
      ...internalBusiness,
      type: 'EXTERNAL_BUSINESS',
    });
    await expect(service.convertToExternal('u1', 'biz-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('flips type, creates source, archives accounts, seeds summary, expires insights, audits', async () => {
    mockPrisma.container.findFirst.mockResolvedValue(internalBusiness);
    mockTx.container.update.mockResolvedValue({
      ...internalBusiness,
      type: 'EXTERNAL_BUSINESS',
    });
    mockTx.externalBusinessSource.create.mockResolvedValue({
      id: 'src-1',
      sourceType: 'MANUAL',
      syncInterval: 'MANUAL',
      lastSummaryAt: new Date(),
      lastSummaryDate: new Date(),
    });
    mockTx.summary.create.mockResolvedValue({
      id: 'seed-1',
      date: new Date(),
      currency: 'KES',
    });

    const result = await service.convertToExternal('u1', 'biz-1');

    expect(mockTx.container.update).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { type: 'EXTERNAL_BUSINESS' },
    });
    expect(mockTx.externalBusinessSource.create).toHaveBeenCalled();
    expect(mockTx.account.updateMany).toHaveBeenCalledWith({
      where: { containerId: 'biz-1', status: 'ACTIVE' },
      data: { status: 'ARCHIVED', archivedAt: expect.any(Date) },
    });

    const createArg = mockTx.summary.create.mock.calls[0][0].data;
    expect(createArg.assetsValue).toBe(100000);
    expect(createArg.liabilitiesValue).toBe(25000);

    expect(mockTx.insight.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        relatedContainerId: 'biz-1',
        type: { in: ['PROFIT_DECLINE', 'RUNWAY_LOW'] },
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRED', expiresAt: expect.any(Date) },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'container',
          entityId: 'biz-1',
          action: 'UPDATE',
          changedFields: ['type'],
        }),
      }),
    );

    expect(result.type).toBe('EXTERNAL_BUSINESS');
    expect(result.seedSummary.netWorth).toBe(75000);
  });
});
