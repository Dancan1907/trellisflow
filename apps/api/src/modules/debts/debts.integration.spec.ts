import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtsService } from './debts.service';

describe('Debts (Integration)', () => {
  let service: DebtsService;
  let prisma: PrismaService;
  let userId: string;
  let containerId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [DebtsService, PrismaService],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
    prisma = module.get<PrismaService>(PrismaService);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `debts-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Debts Test',
      },
    });

    containerId = randomUUID();
    await prisma.container.create({
      data: {
        id: containerId,
        userId,
        type: 'PERSONAL',
        name: 'Personal',
        currency: 'KES',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  async function createLiability(name: string, balance: number): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId,
        containerId,
        name,
        category: 'LIABILITY',
        accountType: 'CREDIT_CARD',
        currency: 'KES',
        currentBalance: balance,
      },
    });
    return accountId;
  }

  it('simulate: 0% APR snowball rolls freed minimums forward (7 months)', async () => {
    const accA = await createLiability('Debt A', 300);
    const accB = await createLiability('Debt B', 1000);

    await service.create(userId, { accountId: accA, minimumPayment: 100, interestRate: 0 });
    await service.create(userId, { accountId: accB, minimumPayment: 100, interestRate: 0 });

    const result = await service.simulate(userId, {
      extraMonthlyPayment: 0,
      method: 'SNOWBALL',
    });

    expect(result.monthsToPayoff).toBe(7);
    expect(result.totalInterestPaid).toBe(0);
    expect(result.history).toHaveLength(7);
    expect(result.history[0].totalBalance).toBe(1100);
    expect(result.history[6].totalBalance).toBe(0);
    expect(result.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Cleanup for next test
    await prisma.account.deleteMany({ where: { id: { in: [accA, accB] } } });
  });

  it('avalanche simulation with real interest accrual', async () => {
    const accA = await createLiability('Low Rate Card', 1000);
    const accB = await createLiability('High Rate Card', 500);

    await service.create(userId, { accountId: accA, minimumPayment: 100, interestRate: 5 });
    await service.create(userId, { accountId: accB, minimumPayment: 100, interestRate: 24 });

    const result = await service.simulate(userId, {
      extraMonthlyPayment: 0,
      method: 'AVALANCHE',
    });

    expect(result.monthsToPayoff).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.history.length).toBe(result.monthsToPayoff);
    expect(result.history[result.history.length - 1].totalBalance).toBe(0);

    await prisma.account.deleteMany({ where: { id: { in: [accA, accB] } } });
  });

  it('findAll returns plans with their linked accounts', async () => {
    const acc = await createLiability('Test Card', 500);
    await service.create(userId, { accountId: acc, minimumPayment: 50, interestRate: 18 });

    const plans = await service.findAll(userId);
    const found = plans.find((p) => p.accountId === acc);

    expect(found).toBeDefined();
    expect(found?.account.name).toBe('Test Card');
    expect(Number(found?.account.currentBalance)).toBe(500);

    await prisma.account.deleteMany({ where: { id: acc } });
  });

  it('remove archives a plan', async () => {
    const acc = await createLiability('Archive Test', 200);
    const plan = await service.create(userId, {
      accountId: acc,
      minimumPayment: 25,
      interestRate: 10,
    });

    await service.remove(userId, plan.id);

    const archived = await prisma.debtPayoffPlan.findUnique({ where: { id: plan.id } });
    expect(archived?.status).toBe('ARCHIVED');

    // findAll should no longer include it
    const active = await service.findAll(userId);
    expect(active.find((p) => p.id === plan.id)).toBeUndefined();

    await prisma.account.deleteMany({ where: { id: acc } });
  });

  it('rejects plans for non-liability accounts', async () => {
    const assetAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: assetAccountId,
        userId,
        containerId,
        name: 'Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 1000,
      },
    });

    await expect(
      service.create(userId, {
        accountId: assetAccountId,
        minimumPayment: 100,
        interestRate: 5,
      }),
    ).rejects.toThrow();

    await prisma.account.deleteMany({ where: { id: assetAccountId } });
  });
});
