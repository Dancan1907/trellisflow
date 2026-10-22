import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Goals (Integration)', () => {
  let service: GoalsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [GoalsService, PrismaService],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `goal-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Goal Test',
      },
    });

    containerId = randomUUID();
    await prisma.container.create({
      data: {
        id: containerId,
        userId: testUserId,
        type: 'PERSONAL',
        name: 'Personal',
        currency: 'KES',
      },
    });

    accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId: testUserId,
        containerId,
        name: 'Savings',
        category: 'ASSET',
        accountType: 'SAVINGS',
        currency: 'KES',
        currentBalance: 5000,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should calculate progress from the real linked account balance', async () => {
    // 1. Create a goal linked to the account
    const goal = await service.create(testUserId, {
      name: 'Test Goal',
      targetAmount: 10000,
      currency: 'KES',
      containerId,
      linkedAccountId: accountId,
    });

    // 2. Fetch the goal and check progress
    const result = await service.findOne(testUserId, goal.id);

    expect(result.currentAmount).toBe(5000);
    expect(result.remaining).toBe(5000);
    expect(result.percentage).toBe(50);

    // 3. Change the real account balance in the DB
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: 8000 },
    });

    // 4. Re-fetch the goal and prove it updated automatically
    const updatedResult = await service.findOne(testUserId, goal.id);
    expect(updatedResult.currentAmount).toBe(8000);
    expect(updatedResult.percentage).toBe(80);
  });
});
