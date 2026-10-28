import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('uses the default limit of 50 when no query is given', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await service.findAllForUser('user-1');

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('respects a custom limit', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await service.findAllForUser('user-1', { limit: 10 });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('applies the entityType filter', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await service.findAllForUser('user-1', { entityType: 'Transaction' });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', entityType: 'Transaction' },
      }),
    );
  });

  it('applies the action filter', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await service.findAllForUser('user-1', { action: 'DELETE' });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', action: 'DELETE' },
      }),
    );
  });

  it('applies both filters together', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await service.findAllForUser('user-1', {
      entityType: 'Account',
      action: 'UPDATE',
      limit: 25,
    });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', entityType: 'Account', action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  });

  it('returns whatever Prisma returns', async () => {
    const rows = [{ id: 'a1' }, { id: 'a2' }];
    mockPrisma.auditLog.findMany.mockResolvedValue(rows);

    const result = await service.findAllForUser('user-1');

    expect(result).toEqual(rows);
  });
});
