import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Dashboard (Integration)', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [DashboardService, PrismaService],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `dash-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Dash Test',
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
        name: 'Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 5000,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should return correct summary with real data', async () => {
    // 1. Create a snapshot
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.netWorthSnapshot.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        date: today,
        totalNetWorth: 5000,
        personalNetWorth: 5000,
        investmentsNetWorth: 0,
        businessesNetWorth: 0,
        breakdown: {},
        currency: 'KES',
      },
    });

    // 2. Create a transaction
    await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        accountId,
        type: 'EXPENSE',
        amount: 1000,
        currency: 'KES',
        date: new Date(),
        description: 'Groceries',
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    // 3. Call the service
    const result = await service.getSummary(testUserId);

    // 4. Verify the math (snapshot net worth + cash flow)
    expect(Number(result.netWorth.total)).toBe(5000);
    expect(result.cashFlow.expenses).toBe(1000);
    expect(result.cashFlow.income).toBe(0);
  });

  it('should return correct container cards with real data', async () => {
    const result = await service.getContainerCards(testUserId);
    expect(result.length).toBe(1);
    expect(result[0].netWorth).toBe(5000); // Our account has 5000
    expect(result[0].accountCount).toBe(1);
  });
});
