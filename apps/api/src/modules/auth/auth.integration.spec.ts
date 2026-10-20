import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
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
      imports: [
        // Explicitly provide a JwtService for the test with a dummy secret
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [
        AuthService,
        PrismaService, // Real Prisma
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
              return null;
            }),
          },
        },
        EmailService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up ALL test users, even if the test failed
    try {
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'integration-' } },
      });
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
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
