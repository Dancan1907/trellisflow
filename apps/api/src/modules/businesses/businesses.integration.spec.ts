import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { BusinessesService } from './businesses.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Businesses (Integration)', () => {
  let service: BusinessesService;
  let prisma: PrismaService;
  let userId: string;
  let businessId: string;
  let accountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [BusinessesService, PrismaService],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
    prisma = module.get<PrismaService>(PrismaService);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `businesses-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Businesses Integration Test',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const business = await service.create(userId, {
      name: 'Corner Shop',
      businessType: 'RETAIL',
      currency: 'KES',
      startDate: '2026-01-15',
      notes: 'Integration test business',
    });

    businessId = business.id;

    accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId,
        containerId: businessId,
        name: 'Business Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 0,
      },
    });
  });

  afterEach(async () => {
    await prisma.container.deleteMany({ where: { id: businessId } });
  });

  // ==========================================================================
  // Create / read
  // ==========================================================================

  it('persists the container, profile, and the default categories', async () => {
    const container = await prisma.container.findUnique({
      where: { id: businessId },
      include: { businessProfile: true },
    });

    expect(container).not.toBeNull();
    expect(container?.type).toBe('INTERNAL_BUSINESS');
    expect(container?.currency).toBe('KES');
    expect(container?.businessProfile?.businessType).toBe('RETAIL');
    expect(container?.businessProfile?.startDate).not.toBeNull();

    const categories = await prisma.category.findMany({ where: { containerId: businessId } });
    expect(categories).toHaveLength(14);
    expect(categories.filter((category) => category.type === 'INCOME')).toHaveLength(5);
    expect(categories.filter((category) => category.type === 'EXPENSE')).toHaveLength(9);
  });

  it('lists only the user’s active internal businesses', async () => {
    const personalId = randomUUID();
    const investmentId = randomUUID();

    await prisma.container.create({
      data: { id: personalId, userId, type: 'PERSONAL', name: 'Personal', currency: 'KES' },
    });
    await prisma.container.create({
      data: { id: investmentId, userId, type: 'INVESTMENT', name: 'Investments', currency: 'KES' },
    });

    try {
      const businesses = await service.findAll(userId);

      expect(businesses).toHaveLength(1);
      expect(businesses[0]?.id).toBe(businessId);
      expect(businesses[0]?.type).toBe('INTERNAL_BUSINESS');
      expect(businesses[0]?.accountCount).toBe(1);
    } finally {
      await prisma.container.deleteMany({ where: { id: { in: [personalId, investmentId] } } });
    }
  });

  it('returns accounts and net worth from real balances', async () => {
    await prisma.account.update({ where: { id: accountId }, data: { currentBalance: 10000 } });
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: businessId,
        name: 'Business Loan',
        category: 'LIABILITY',
        accountType: 'PERSONAL_LOAN',
        currency: 'KES',
        currentBalance: 2500,
      },
    });

    const business = await service.findOne(userId, businessId);

    expect(business.accounts).toHaveLength(2);
    expect(business.netWorth).toMatchObject({
      totalAssets: 10000,
      totalLiabilities: 2500,
      netWorth: 7500,
      currency: 'KES',
    });

    const netWorth = await service.getNetWorth(userId, businessId);
    expect(netWorth.netWorth).toBe(7500);
  });

  // ==========================================================================
  // Update / archive
  // ==========================================================================

  it('updates the container name and profile fields together', async () => {
    await service.update(userId, businessId, {
      name: 'Renamed Shop',
      businessType: 'SERVICE',
      notes: 'Updated notes',
    });

    const container = await prisma.container.findUnique({
      where: { id: businessId },
      include: { businessProfile: true },
    });

    expect(container?.name).toBe('Renamed Shop');
    expect(container?.businessProfile?.businessType).toBe('SERVICE');
    expect(container?.businessProfile?.notes).toBe('Updated notes');
  });

  it('archives the business and hides it from reads', async () => {
    const archived = await service.archive(userId, businessId);
    expect(archived.status).toBe('ARCHIVED');

    const row = await prisma.container.findUnique({ where: { id: businessId } });
    expect(row?.status).toBe('ARCHIVED');
    expect(row?.archivedAt).not.toBeNull();

    await expect(service.findOne(userId, businessId)).rejects.toThrow(NotFoundException);

    const businesses = await service.findAll(userId);
    expect(businesses.find((business) => business.id === businessId)).toBeUndefined();
  });

  // ==========================================================================
  // P&L / runway
  // ==========================================================================

  it('includes both boundary days of a P&L range and excludes the days around it', async () => {
    const categories = await prisma.category.findMany({ where: { containerId: businessId } });
    const incomeCategory = categories.find((category) => category.type === 'INCOME')!;
    const expenseCategory = categories.find((category) => category.type === 'EXPENSE')!;

    const addTransaction = (
      type: 'INCOME' | 'EXPENSE',
      amount: number,
      date: string,
      categoryId: string,
    ) =>
      prisma.transaction.create({
        data: {
          id: randomUUID(),
          userId,
          containerId: businessId,
          accountId,
          type,
          amount,
          currency: 'KES',
          date: new Date(date),
          description: `${type} on ${date}`,
          categoryId,
          status: 'POSTED',
        },
      });

    // Inside the requested range (the two boundary days).
    await addTransaction('INCOME', 1000, '2026-11-01', incomeCategory.id);
    await addTransaction('EXPENSE', 400, '2026-11-30', expenseCategory.id);

    // Outside the range, but inside the widened SQL window.
    await addTransaction('INCOME', 9999, '2026-10-31', incomeCategory.id);
    await addTransaction('EXPENSE', 9999, '2026-12-01', expenseCategory.id);

    const pnl = await service.getPnl(userId, businessId, {
      from: '2026-11-01',
      to: '2026-11-30',
    });

    expect(pnl.totalIncome).toBe(1000);
    expect(pnl.totalExpenses).toBe(400);
    expect(pnl.netProfit).toBe(600);
    expect(pnl.byCategory).toHaveLength(2);
  });

  it('computes runway from liquid cash and real expenses', async () => {
    await prisma.account.update({ where: { id: accountId }, data: { currentBalance: 12000 } });

    const expenseCategory = await prisma.category.findFirst({
      where: { containerId: businessId, type: 'EXPENSE' },
    });

    await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: businessId,
        accountId,
        type: 'EXPENSE',
        amount: 6000,
        currency: 'KES',
        date: new Date(new Date().toISOString().slice(0, 10)),
        description: 'Quarterly running costs',
        categoryId: expenseCategory!.id,
        status: 'POSTED',
      },
    });

    const runway = await service.getRunway(userId, businessId);

    expect(runway.cashBalance).toBe(12000);
    expect(runway.monthlyBurn).toBe(2000);
    expect(runway.runwayMonths).toBe(6);
  });

  // ==========================================================================
  // Validation / tenancy
  // ==========================================================================

  it('rejects a P&L range whose start is after its end', async () => {
    await expect(
      service.getPnl(userId, businessId, { from: '2026-11-30', to: '2026-11-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not expose a business to another user', async () => {
    const otherUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: otherUserId,
        email: `businesses-other-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Other User',
      },
    });

    try {
      await expect(service.findOne(otherUserId, businessId)).rejects.toThrow(NotFoundException);
      await expect(service.getNetWorth(otherUserId, businessId)).rejects.toThrow(NotFoundException);
    } finally {
      await prisma.user.delete({ where: { id: otherUserId } });
    }
  });
});
