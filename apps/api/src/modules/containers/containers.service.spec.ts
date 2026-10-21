import { Test, TestingModule } from '@nestjs/testing';
import { ContainersService } from './containers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  container: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  businessProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('ContainersService', () => {
  let service: ContainersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContainersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ContainersService>(ContainersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException if container name exists', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: '1' });
      await expect(
        service.create('user-1', { name: 'Test', type: 'INTERNAL_BUSINESS', currency: 'KES' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if type is PERSONAL', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);
      await expect(
        service.create('user-1', { name: 'Test', type: 'PERSONAL', currency: 'KES' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a new container', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);
      mockPrisma.container.create.mockResolvedValue({
        id: '2',
        name: 'Test',
        type: 'INTERNAL_BUSINESS',
      });

      const result = await service.create('user-1', {
        name: 'Test',
        type: 'INTERNAL_BUSINESS',
        currency: 'KES',
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('archive', () => {
    it('should throw ConflictException if container is PERSONAL', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({
        id: '1',
        type: 'PERSONAL',
        userId: 'user-1',
      });
      await expect(service.archive('user-1', '1')).rejects.toThrow(ConflictException);
    });
  });
});
