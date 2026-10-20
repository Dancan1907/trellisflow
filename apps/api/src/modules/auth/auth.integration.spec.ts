import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';
import { ConflictException } from '@nestjs/common';

// Use real secrets from process.env (loaded by test/setup.ts).
const mockConfig = {
  get: jest.fn((key: string) => {
    const config = {
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test-access-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    };

    return config[key as keyof typeof config];
  }),
};

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
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        EmailService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up all integration test users, including leftovers from previous runs.
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

    // Query the database directly to verify the user was saved.
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { containers: true },
    });

    expect(userInDb).toBeDefined();
    expect(userInDb?.containers.length).toBe(1);
    expect(userInDb?.containers[0].type).toBe('PERSONAL');
  });

  it('should throw a ConflictException if we try to sign up with the same email twice', async () => {
    await expect(
      service.signup({
        email: testEmail,
        password: 'newpassword',
        name: 'Duplicate User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
