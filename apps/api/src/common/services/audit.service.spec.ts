import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
  },
};

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log a CREATE action with before=null', async () => {
    const afterState = { id: 'tx-1', amount: 100, description: 'Test' };

    await service.log(
      mockPrisma, // Pretending this is the tx client
      'user-1',
      'Transaction',
      'tx-1',
      AuditAction.CREATE,
      null, // before
      afterState, // after
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        entityType: 'Transaction',
        entityId: 'tx-1',
        action: 'CREATE',
        before: undefined, // Because we passed null
        after: afterState,
        changedFields: [],
      }),
    });
  });

  it('should log an UPDATE action and calculate changedFields', async () => {
    const beforeState = { id: 'tx-1', amount: 100, description: 'Old' };
    const afterState = { id: 'tx-1', amount: 200, description: 'Old' };

    await service.log(
      mockPrisma,
      'user-1',
      'Transaction',
      'tx-1',
      AuditAction.UPDATE,
      beforeState,
      afterState,
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATE',
        before: beforeState,
        after: afterState,
        changedFields: ['amount'], // Only 'amount' changed
      }),
    });
  });
});
