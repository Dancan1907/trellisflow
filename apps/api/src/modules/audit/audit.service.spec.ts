import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // `count` is called inside a $transaction with `findMany`, so it needs
    // a resolved value in every test.
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('uses the default limit of 50 when no query is given', async () => {
    await service.findAllForUser('user-1');

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
    });
  });

  it('respects a custom limit', async () => {
    await service.findAllForUser('user-1', { limit: 10 });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('applies the entityType filter', async () => {
    await service.findAllForUser('user-1', { entityType: 'Transaction' });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', entityType: 'Transaction' },
      }),
    );
  });

  it('applies the action filter', async () => {
    await service.findAllForUser('user-1', { action: 'DELETE' });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', action: 'DELETE' },
      }),
    );
  });

  it('applies both filters together', async () => {
    await service.findAllForUser('user-1', {
      entityType: 'Account',
      action: 'UPDATE',
      limit: 25,
    });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', entityType: 'Account', action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
      take: 25,
      skip: 0,
    });
  });

  it('returns whatever Prisma returns with pagination metadata', async () => {
    const rows = [{ id: 'a1' }, { id: 'a2' }];
    prismaMock.auditLog.findMany.mockResolvedValue(rows);
    prismaMock.auditLog.count.mockResolvedValue(2);

    const result = await service.findAllForUser('user-1', { limit: 10, offset: 0 });

    expect(result.items).toEqual(rows);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });
});
