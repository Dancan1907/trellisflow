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
      // The service calls findOne (which uses findFirst), then findOne again.
      // We mock findFirst to return a category that ALREADY has a parent.
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'parent-1',
        parentId: 'grandparent-1', // <--- This triggers the nesting check
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
      // 1st call: findOne for parent (we pass no parentId, so this is skipped)
      // 2nd call: check for duplicate name -> return a match
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(null) // Just in case findOne is called
        .mockResolvedValueOnce({ id: 'dup' }); // The duplicate check

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
      // findOne returns a system category
      mockPrisma.category.findFirst.mockResolvedValue({
        id: '1',
        isSystem: true,
      });

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });

    it('should prevent archiving if it has active subcategories', async () => {
      // findOne returns a normal category
      mockPrisma.category.findFirst.mockResolvedValue({
        id: '1',
        isSystem: false,
      });

      // count returns 2 (meaning it has children)
      mockPrisma.category.count.mockResolvedValue(2);

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });
  });
});
