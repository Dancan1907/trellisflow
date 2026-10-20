import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';
import { ConflictException } from '@nestjs/common';

// We are NOT mocking Prisma here. We are using the real database.
describe('AuthService (Integration)', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const testEmail = `integration-${Date.now()}@trellisflow.com`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PrismaService, // Real Prisma
        JwtService,
        ConfigService,
        EmailService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up ALL integration test users, just in case old ones are stuck.
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'integration-',
        },
      },
    });

    await prisma.$disconnect();
  });

  it('should actually create a user and a personal container in the database', async () => {
    const result = await service.signup({
      email: testEmail,
      password: 'password123',
      name: 'Integration Test User',
    });

    expect(result.user.email).toBe(testEmail);

    // Query the database directly to verify it was saved.
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { containers: true },
    });

    expect(userInDb).toBeDefined();
    expect(userInDb?.containers.length).toBe(1);
    expect(userInDb?.containers[0].type).toBe('PERSONAL');
  });

  it('should throw a Prisma error if we try to sign up with the same email twice', async () => {
    // We already created the user in the previous test.
    await expect(
      service.signup({
        email: testEmail,
        password: 'newpassword',
        name: 'Duplicate User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
