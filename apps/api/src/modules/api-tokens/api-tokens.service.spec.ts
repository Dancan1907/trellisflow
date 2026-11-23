import { Test, TestingModule } from '@nestjs/testing';
import { ApiTokensService } from './api-tokens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const mockPrisma = {
  container: { findFirst: jest.fn() },
  apiToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  // Array form of $transaction: just resolve every operation.
  $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
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

    it('stores a hash, never the raw token', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: 'biz-1' });
      mockPrisma.apiToken.create.mockImplementation((args) => args.data);

      const result = await service.create('user-1', 'biz-1', { label: 'Test Token' });

      const stored = mockPrisma.apiToken.create.mock.calls[0][0].data;
      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(stored)).not.toContain(result.token);
    });

    it('defaults to a 90-day expiry', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: 'biz-1' });
      mockPrisma.apiToken.create.mockImplementation((args) => args.data);

      const result = await service.create('user-1', 'biz-1', { label: 'Test Token' });

      const days = (result.expiresAt.getTime() - Date.now()) / DAY;
      expect(days).toBeGreaterThan(89.9);
      expect(days).toBeLessThanOrEqual(90);
    });

    it('honours an explicit expiry', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: 'biz-1' });
      mockPrisma.apiToken.create.mockImplementation((args) => args.data);

      const result = await service.create('user-1', 'biz-1', {
        label: 'Short',
        expiresAt: '2030-01-01T00:00:00.000Z',
      });

      expect(result.expiresAt.toISOString()).toBe('2030-01-01T00:00:00.000Z');
    });

    it('throws if business does not exist', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);
      await expect(service.create('user-1', 'biz-1', { label: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    const row = (overrides: Record<string, unknown>) => ({
      id: 't1',
      label: 'Token',
      tokenPrefix: 'tf_live_aaaa',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60 * DAY),
      lastUsedAt: null,
      createdAt: new Date(),
      ...overrides,
    });

    it('flags tokens that expire within 14 days', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        row({ id: 'far', expiresAt: new Date(Date.now() + 60 * DAY) }),
        row({ id: 'soon', expiresAt: new Date(Date.now() + 5 * DAY - HOUR) }),
      ]);

      const [far, soon] = await service.findAll('user-1', 'biz-1');

      expect(far?.expiringSoon).toBe(false);
      expect(far?.expiresInDays).toBe(60);
      expect(soon?.expiringSoon).toBe(true);
      expect(soon?.expiresInDays).toBe(5);
    });

    it('reports a past-expiry ACTIVE token as EXPIRED', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        row({ expiresAt: new Date(Date.now() - DAY) }),
      ]);

      const [token] = await service.findAll('user-1', 'biz-1');

      expect(token?.status).toBe('EXPIRED');
      expect(token?.expiringSoon).toBe(false);
      expect(token?.expiresInDays).toBeNull();
    });

    it('does not warn about revoked tokens', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        row({ status: 'REVOKED', expiresAt: new Date(Date.now() + 2 * DAY) }),
      ]);

      const [token] = await service.findAll('user-1', 'biz-1');

      expect(token?.status).toBe('REVOKED');
      expect(token?.expiringSoon).toBe(false);
    });
  });

  describe('revoke', () => {
    it('throws if the token is not found', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(null);
      await expect(service.revoke('user-1', 't1')).rejects.toThrow(NotFoundException);
    });

    it('revokes and never selects the token hash', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.apiToken.update.mockResolvedValue({ id: 't1', status: 'REVOKED' });

      await service.revoke('user-1', 't1');

      const args = mockPrisma.apiToken.update.mock.calls[0][0];
      expect(args.data.status).toBe('REVOKED');
      expect(args.select).toBeDefined();
      expect(args.select.tokenHash).toBeUndefined();
    });
  });

  describe('rotate', () => {
    const activeToken = () => ({
      id: 'old',
      label: 'Production',
      tokenPrefix: 'tf_live_aaaa',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60 * DAY),
    });

    beforeEach(() => {
      mockPrisma.apiToken.create.mockImplementation((args) => args.data);
      mockPrisma.apiToken.update.mockResolvedValue({});
    });

    it('throws if the token is not found', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(null);
      await expect(service.rotate('user-1', 'biz-1', 'old')).rejects.toThrow(NotFoundException);
    });

    it('refuses to rotate a revoked token', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue({ ...activeToken(), status: 'REVOKED' });
      await expect(service.rotate('user-1', 'biz-1', 'old')).rejects.toThrow(BadRequestException);
    });

    it('refuses to rotate a token that has already expired', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue({
        ...activeToken(),
        expiresAt: new Date(Date.now() - DAY),
      });
      await expect(service.rotate('user-1', 'biz-1', 'old')).rejects.toThrow(BadRequestException);
    });

    it('rejects a new expiry in the past', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());
      await expect(
        service.rotate('user-1', 'biz-1', 'old', { expiresAt: '2020-01-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.apiToken.create).not.toHaveBeenCalled();
    });

    it('issues a new token, keeps the label, and defaults to 90 days', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());

      const result = await service.rotate('user-1', 'biz-1', 'old');

      expect(result.token).toMatch(/^tf_live_/);
      expect(result.label).toBe('Production');
      expect((result.expiresAt.getTime() - Date.now()) / DAY).toBeGreaterThan(89.9);

      const stored = mockPrisma.apiToken.create.mock.calls[0][0].data;
      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(stored)).not.toContain(result.token);
    });

    it('lets the caller change the label and expiry', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());

      const result = await service.rotate('user-1', 'biz-1', 'old', {
        label: 'Renamed',
        expiresAt: '2031-06-01T00:00:00.000Z',
      });

      expect(result.label).toBe('Renamed');
      expect(result.expiresAt.toISOString()).toBe('2031-06-01T00:00:00.000Z');
    });

    it('keeps the old token alive for a 24h grace period by default', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());

      const result = await service.rotate('user-1', 'biz-1', 'old');

      const graceHours = (result.previousToken.expiresAt.getTime() - Date.now()) / HOUR;
      expect(graceHours).toBeGreaterThan(23.9);
      expect(graceHours).toBeLessThanOrEqual(24);
      expect(result.previousToken.status).toBe('ACTIVE');
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith({
        where: { id: 'old' },
        data: { expiresAt: result.previousToken.expiresAt },
      });
    });

    it('never extends the old token beyond its own expiry', async () => {
      const soon = new Date(Date.now() + 2 * HOUR);
      mockPrisma.apiToken.findFirst.mockResolvedValue({ ...activeToken(), expiresAt: soon });

      const result = await service.rotate('user-1', 'biz-1', 'old', { gracePeriodHours: 48 });

      expect(result.previousToken.expiresAt).toEqual(soon);
    });

    it('revokes the old token immediately when gracePeriodHours is 0', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());

      const result = await service.rotate('user-1', 'biz-1', 'old', { gracePeriodHours: 0 });

      expect(result.previousToken.status).toBe('REVOKED');
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith({
        where: { id: 'old' },
        data: expect.objectContaining({
          status: 'REVOKED',
          revokedReason: 'Replaced by rotated token',
        }),
      });
    });

    it('creates the new token and retires the old one in one transaction', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(activeToken());

      await service.rotate('user-1', 'biz-1', 'old');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction.mock.calls[0]?.[0]).toHaveLength(2);
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
