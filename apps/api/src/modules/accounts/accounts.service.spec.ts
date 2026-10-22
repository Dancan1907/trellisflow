import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  account: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  container: {
    findFirst: jest.fn(),
  },
  transaction: {
    count: jest.fn(),
  },
};

describe('AccountsService', () => {
  let service: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException if container does not exist', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          name: 'Test',
          category: 'ASSET',
          accountType: 'CHECKING',
          currency: 'KES',
          containerId: 'fake-container',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should throw ConflictException if account has transactions', async () => {
      // Mock account exists
      mockPrisma.account.findFirst.mockResolvedValue({ id: '1', userId: 'user-1' });

      // Mock transaction count > 0
      mockPrisma.transaction.count.mockResolvedValue(3);

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getNetWorth', () => {
    it('should calculate net worth correctly (assets - liabilities)', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { category: 'ASSET', currentBalance: '5000' },
        { category: 'ASSET', currentBalance: '2000' },
        { category: 'LIABILITY', currentBalance: '1500' },
      ]);

      const result = await service.getNetWorth('user-1');

      expect(result).toEqual({
        totalAssets: 7000,
        totalLiabilities: 1500,
        totalNetWorth: 5500,
      });
    });
  });
});
