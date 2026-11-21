import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

const mockTx = {
  container: { update: jest.fn() },
  externalBusinessSource: { create: jest.fn() },
  account: { updateMany: jest.fn() },
  summary: { create: jest.fn() },
  insight: { updateMany: jest.fn() },
};

const mockPrisma: any = {
  container: { findFirst: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockTx)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('BusinessesService.convertToExternal', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
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
      { category: 'ASSET', currentBalance: '60000' },
      { category: 'ASSET', currentBalance: '40000' },
      { category: 'LIABILITY', currentBalance: '25000' },
    ],
  };

  it('throws NotFound for an unknown / unowned business', async () => {
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

  it('flips type, creates source, archives accounts, seeds summary, expires insights', async () => {
    mockPrisma.container.findFirst.mockResolvedValue(internalBusiness);
    mockTx.container.update.mockResolvedValue({ ...internalBusiness, type: 'EXTERNAL_BUSINESS' });
    mockTx.externalBusinessSource.create.mockResolvedValue({
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

    // Seed summary should reflect 100k assets - 25k liabilities = 75k net worth.
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

    expect(result.type).toBe('EXTERNAL_BUSINESS');
    expect(result.seedSummary.netWorth).toBe(75000);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'container',
        entityId: 'biz-1',
        action: 'UPDATE',
        changedFields: ['type'],
      }),
    );
  });
});
