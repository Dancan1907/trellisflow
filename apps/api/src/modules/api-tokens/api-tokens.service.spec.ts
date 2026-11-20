import { Test, TestingModule } from '@nestjs/testing';
import { ApiTokensService } from './api-tokens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

const mockPrisma = {
  container: { findFirst: jest.fn() },
  apiToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('ApiTokensService', () => {
  let service: ApiTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiTokensService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ApiTokensService>(ApiTokensService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates a token and returns the raw string once', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: 'biz-1' });
      mockPrisma.apiToken.create.mockImplementation((args) => args.data);

      const result = await service.create('user-1', 'biz-1', { label: 'Test Token' });

      expect(result.token).toMatch(/^tf_live_/);
      expect(result.message).toContain('Save this token securely');
      expect(mockPrisma.apiToken.create).toHaveBeenCalled();
    });

    it('throws if business does not exist', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);
      await expect(service.create('user-1', 'biz-1', { label: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateToken', () => {
    it('throws on invalid token', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue(null);
      await expect(service.validateToken('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on revoked token', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        status: 'REVOKED',
        expiresAt: new Date(),
      });
      await expect(service.validateToken('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on expired token and marks it as expired', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 't1',
        status: 'ACTIVE',
        expiresAt: new Date('2020-01-01'),
      });
      await expect(service.validateToken('invalid')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'EXPIRED' },
        }),
      );
    });

    it('returns token and updates lastUsedAt for valid token', async () => {
      // validateToken fires `update(...).catch(...)`, so the mock must return a promise
      mockPrisma.apiToken.update.mockResolvedValue({});
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 't1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 10000),
        container: { id: 'biz-1' },
      });

      const result = await service.validateToken('valid');
      expect(result.container.id).toBe('biz-1');
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: { lastUsedAt: expect.any(Date) },
        }),
      );
    });
  });
});
