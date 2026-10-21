import { Test, TestingModule } from '@nestjs/testing';
import { ContainersService } from './containers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('ContainersService (Integration)', () => {
  let service: ContainersService;
  let prisma: PrismaService;
  let testUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContainersService, PrismaService],
    }).compile();

    service = module.get<ContainersService>(ContainersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a dummy user for this test suite
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `container-test-${Date.now()}@trellisflow.com`,
        passwordHash: 'dummy-hash',
        name: 'Container Test User',
      },
    });
  });

  afterAll(async () => {
    // Cleanup: deleting the user cascades to delete their containers
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should successfully create a container in the database', async () => {
    const result = await service.create(testUserId, {
      name: 'My Test Business',
      type: 'INTERNAL_BUSINESS',
      currency: 'KES',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('My Test Business');
    expect(result.userId).toBe(testUserId);

    // Verify it's actually in the DB
    const inDb = await prisma.container.findUnique({ where: { id: result.id } });
    expect(inDb).not.toBeNull();
  });

  it('should throw an error if a duplicate name is used', async () => {
    await expect(
      service.create(testUserId, {
        name: 'My Test Business', // Same name as above
        type: 'INTERNAL_BUSINESS',
        currency: 'KES',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent manual creation of a PERSONAL container', async () => {
    await expect(
      service.create(testUserId, {
        name: 'Another Personal',
        type: 'PERSONAL',
        currency: 'KES',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
