import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Accounts (Integration)', () => {
  let service: AccountsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [
        AccountsService,
        PrismaService,
        { provide: SnapshotsService, useValue: { computeAndSaveForUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `acc-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Acc Test',
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should correctly calculate net worth from real DB values', async () => {
    // Create an asset (1000) and a liability (300)
    await service.create(testUserId, {
      name: 'Asset',
      category: 'ASSET',
      accountType: 'CHECKING',
      currency: 'KES',
      initialBalance: 1000,
      containerId,
    });
    await service.create(testUserId, {
      name: 'Liability',
      category: 'LIABILITY',
      accountType: 'CREDIT_CARD',
      currency: 'KES',
      initialBalance: 300,
      containerId,
    });

    const result = await service.getNetWorth(testUserId);

    expect(result.totalAssets).toBe(1000);
    expect(result.totalLiabilities).toBe(300);
    expect(result.totalNetWorth).toBe(700);
  });
});
