import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    email: 'demo@trellisflow.com',
    name: 'Demo User',
    emailVerifiedAt: null,
    timezone: 'UTC',
    reportingCurrency: 'USD',
    tier: 'FREE',
    personaHint: null,
    createdAt: new Date('2026-01-01'),
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getMe', () => {
    it('returns the user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('updates and returns the user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      prismaMock.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { name: 'New Name' });

      expect(result).toEqual(updated);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
        select: expect.any(Object),
      });
    });
  });
});
