import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw BadRequestException if nesting deeper than 1 level', async () => {
      // Mock findFirst to return a category that already has a parent
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'parent-1',
        parentId: 'grandparent-1',
      });

      await expect(
        service.create('user-1', {
          name: 'Child',
          type: 'EXPENSE',
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate name exists at same level', async () => {
      // We use mockImplementation to inspect the query arguments.
      // If it's looking for a duplicate name, return a match.
      // Otherwise (looking up a parent), return null.
      mockPrisma.category.findFirst.mockImplementation((args) => {
        if (args.where.name === 'Food') {
          return Promise.resolve({ id: 'dup' });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.create('user-1', {
          name: 'Food',
          type: 'EXPENSE',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('should prevent archiving system categories', async () => {
      // Mock findFirst to return a system category
      mockPrisma.category.findFirst.mockResolvedValue({
        id: '1',
        isSystem: true,
      });

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });

    it('should prevent archiving if it has active subcategories', async () => {
      // Mock findFirst to return a normal category
      mockPrisma.category.findFirst.mockResolvedValue({
        id: '1',
        isSystem: false,
      });

      // Mock count to return 2 (meaning it has children)
      mockPrisma.category.count.mockResolvedValue(2);

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });
  });
});
