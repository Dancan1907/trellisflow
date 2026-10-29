import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsService } from './snapshots.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Snapshots (Integration)', () => {
  let service: SnapshotsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [SnapshotsService, PrismaService],
    }).compile();

    service = module.get<SnapshotsService>(SnapshotsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `snap-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Snap Test',
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

  it('should compute net worth correctly from accounts (assets - liabilities)', async () => {
    // 1. Create an Asset of 5,000
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        name: 'Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 5000,
      },
    });

    // 2. Create a Liability of 1,000
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        name: 'Credit Card',
        category: 'LIABILITY',
        accountType: 'CREDIT_CARD',
        currency: 'KES',
        currentBalance: 1000,
      },
    });

    // 3. Run the snapshot
    const snapshot = await service.computeAndSaveForUser(testUserId);

    // 4. Verify the math (5000 - 1000 = 4000)
    expect(Number(snapshot.totalNetWorth)).toBe(4000);
    expect(Number(snapshot.personalNetWorth)).toBe(4000);
    expect(Number(snapshot.investmentsNetWorth)).toBe(0);
    expect(Number(snapshot.businessesNetWorth)).toBe(0);

    // 5. Idempotency check: Run again, it should UPDATE, not duplicate
    const secondSnapshot = await service.computeAndSaveForUser(testUserId);
    const count = await prisma.netWorthSnapshot.count({ where: { userId: testUserId } });

    expect(count).toBe(1); // Proves it upserts instead of creating a new row
    expect(secondSnapshot.id).toBe(snapshot.id); // Proves it's the exact same row
  });
});
