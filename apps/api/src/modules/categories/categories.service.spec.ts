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
      // Mock: Parent category exists, but it already has a parent
      mockPrisma.category.findFirst.mockResolvedValueOnce({ id: '1', parentId: 'some-other-id' });

      await expect(
        service.create('user-1', {
          name: 'Child',
          type: 'EXPENSE',
          parentId: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate name exists at same level', async () => {
      // Mock: Parent check passes (no parent provided), but duplicate name found
      mockPrisma.category.findFirst.mockResolvedValueOnce(null); // findOne check (not called)
      mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'dup' }); // duplicate check

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
      mockPrisma.category.findFirst.mockResolvedValue({ id: '1', isSystem: true });

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });

    it('should prevent archiving if it has active subcategories', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: '1', isSystem: false });
      mockPrisma.category.count.mockResolvedValue(2); // 2 children exist

      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });
  });
});
