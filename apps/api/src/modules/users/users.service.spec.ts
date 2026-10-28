import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
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
    session: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('changePassword', () => {
    it('rejects when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', {
          currentPassword: 'whatever',
          newPassword: 'newpassword123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the current password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: await argon2.hash('correct-password'),
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-password',
          newPassword: 'newpassword123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates the password and revokes all sessions', async () => {
      const currentHash = await argon2.hash('current-password');

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: currentHash,
      });
      prismaMock.user.update.mockResolvedValue(mockUser);
      prismaMock.session.updateMany.mockResolvedValue({ count: 3 });
      prismaMock.$transaction.mockResolvedValue([mockUser, { count: 3 }]);

      const result = await service.changePassword('user-1', {
        currentPassword: 'current-password',
        newPassword: 'newpassword123',
      });

      expect(result.message).toMatch(/Password changed/);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { passwordHash: expect.any(String) },
        }),
      );
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
