import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

describe('Categories (Integration)', () => {
  let service: CategoriesService;
  let prisma: PrismaService;
  let testUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [CategoriesService, PrismaService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `cat-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Cat Test',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should enforce one-level nesting in the database', async () => {
    // 1. Create a parent category
    const parent = await service.create(testUserId, {
      name: 'Food',
      type: 'EXPENSE',
    });

    // 2. Create a child category
    const child = await service.create(testUserId, {
      name: 'Groceries',
      type: 'EXPENSE',
      parentId: parent.id,
    });

    expect(child.parentId).toBe(parent.id);

    // 3. Attempt to create a grandchild (should fail)
    await expect(
      service.create(testUserId, {
        name: 'Fruits',
        type: 'EXPENSE',
        parentId: child.id,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should build a nested tree structure from real data', async () => {
    // We already created Food -> Groceries in the previous test.
    // Let's add another child to Food.
    const parent = await prisma.category.findFirst({ where: { userId: testUserId, name: 'Food' } });
    if (!parent) throw new Error('Parent not found');

    await service.create(testUserId, {
      name: 'Dining',
      type: 'EXPENSE',
      parentId: parent.id,
    });

    // Fetch the tree
    const tree = await service.findAllForUser(testUserId, 'EXPENSE');

    // Expect the Food node to have 2 children
    const foodNode = tree.find((node: any) => node.name === 'Food');
    expect(foodNode).toBeDefined();
    expect(foodNode.children.length).toBe(2);
    expect(foodNode.children.map((c: any) => c.name).sort()).toEqual(['Dining', 'Groceries']);
  });
});
