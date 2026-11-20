import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IDEMPOTENCY_KEY_TTL_MS,
  IdempotencyService,
  canonicalJson,
  hashRequest,
} from './idempotency.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  idempotencyKey: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 'rec-1',
  requestHash: 'hash-a',
  responseStatus: 201,
  responseBody: { id: 'sum-1' },
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
});

describe('canonicalJson / hashRequest', () => {
  it('ignores object key order', () => {
    expect(canonicalJson({ a: 1, b: { d: 4, c: 3 } })).toBe(
      canonicalJson({ b: { c: 3, d: 4 }, a: 1 }),
    );
  });

  it('respects array order and values', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    expect(canonicalJson({ a: 1 })).not.toBe(canonicalJson({ a: '1' }));
  });

  it('handles undefined and null bodies', () => {
    expect(canonicalJson(undefined)).toBe('null');
    expect(canonicalJson(null)).toBe('null');
  });

  it('produces different hashes for different method, path or body', () => {
    const base = hashRequest('POST', '/v1/summary', { a: 1 });
    expect(hashRequest('POST', '/v1/summary', { a: 1 })).toBe(base);
    expect(hashRequest('PUT', '/v1/summary', { a: 1 })).not.toBe(base);
    expect(hashRequest('POST', '/v1/summary/bulk', { a: 1 })).not.toBe(base);
    expect(hashRequest('POST', '/v1/summary', { a: 2 })).not.toBe(base);
  });
});

describe('IdempotencyService', () => {
  const service = new IdempotencyService(mockPrisma as unknown as PrismaService);

  afterEach(() => jest.resetAllMocks());

  describe('begin', () => {
    it('reserves a brand new key', async () => {
      mockPrisma.idempotencyKey.create.mockResolvedValue({});

      const result = await service.begin('tok-1', 'key-1', 'hash-a');

      expect(result.kind).toBe('new');
      const data = mockPrisma.idempotencyKey.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ tokenId: 'tok-1', key: 'key-1', requestHash: 'hash-a' });
      expect(data.expiresAt.getTime() - Date.now()).toBeGreaterThan(IDEMPOTENCY_KEY_TTL_MS - 5_000);
    });

    it('rethrows unrelated database errors', async () => {
      mockPrisma.idempotencyKey.create.mockRejectedValue(new Error('db down'));
      await expect(service.begin('tok-1', 'key-1', 'hash-a')).rejects.toThrow('db down');
    });

    it('replays the stored response for the same key and payload', async () => {
      mockPrisma.idempotencyKey.create.mockRejectedValue(uniqueViolation());
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(stored());

      const result = await service.begin('tok-1', 'key-1', 'hash-a');

      expect(result).toEqual({ kind: 'replay', status: 201, body: { id: 'sum-1' } });
      expect(mockPrisma.idempotencyKey.findUnique).toHaveBeenCalledWith({
        where: { tokenId_key: { tokenId: 'tok-1', key: 'key-1' } },
      });
    });

    it('reports a mismatch when the same key is used with a different payload', async () => {
      mockPrisma.idempotencyKey.create.mockRejectedValue(uniqueViolation());
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(stored());

      const result = await service.begin('tok-1', 'key-1', 'hash-DIFFERENT');

      expect(result.kind).toBe('mismatch');
    });

    it('reports in-progress while the first request is still running', async () => {
      mockPrisma.idempotencyKey.create.mockRejectedValue(uniqueViolation());
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(
        stored({ responseStatus: null, responseBody: null }),
      );

      const result = await service.begin('tok-1', 'key-1', 'hash-a');

      expect(result.kind).toBe('in-progress');
    });

    it('restarts when an unfinished request was abandoned (older than 60s)', async () => {
      mockPrisma.idempotencyKey.create
        .mockRejectedValueOnce(uniqueViolation())
        .mockResolvedValueOnce({});
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(
        stored({ responseStatus: null, createdAt: new Date(Date.now() - 120_000) }),
      );
      mockPrisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.begin('tok-1', 'key-1', 'hash-a');

      expect(result.kind).toBe('new');
      expect(mockPrisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    });

    it('treats an expired key as new', async () => {
      mockPrisma.idempotencyKey.create
        .mockRejectedValueOnce(uniqueViolation())
        .mockResolvedValueOnce({});
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(
        stored({ expiresAt: new Date(Date.now() - 1_000) }),
      );
      mockPrisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.begin('tok-1', 'key-1', 'hash-a');

      expect(result.kind).toBe('new');
    });

    it('gives up with a 409 if the key cannot be reserved after one retry', async () => {
      mockPrisma.idempotencyKey.create.mockRejectedValue(uniqueViolation());
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);

      await expect(service.begin('tok-1', 'key-1', 'hash-a')).rejects.toThrow(ConflictException);
    });
  });

  describe('complete', () => {
    it('stores the status and a JSON-normalised body', async () => {
      mockPrisma.idempotencyKey.update.mockResolvedValue({});
      const createdAt = new Date('2026-11-20T10:00:00.000Z');

      await service.complete('rec-1', 201, { id: 'sum-1', createdAt });

      expect(mockPrisma.idempotencyKey.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: {
          responseStatus: 201,
          responseBody: { id: 'sum-1', createdAt: '2026-11-20T10:00:00.000Z' },
        },
      });
    });
  });

  describe('release / purgeExpired', () => {
    it('release deletes the record', async () => {
      mockPrisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 1 });
      await service.release('rec-1');
      expect(mockPrisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    });

    it('purgeExpired removes keys past their TTL and returns the count', async () => {
      mockPrisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 4 });
      await expect(service.purgeExpired()).resolves.toBe(4);
      expect(mockPrisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lte: expect.any(Date) } },
      });
    });
  });
});
