import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

/** How long a key is remembered. After this, the same key is treated as a new request. */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/** A request that never finished (e.g. the server crashed) is considered abandoned after this. */
export const IDEMPOTENCY_IN_PROGRESS_TIMEOUT_MS = 60 * 1000;

export type IdempotencyBegin =
  /** First time we see this key: go ahead and run the request. */
  | { kind: 'new'; recordId: string }
  /** Same key + same request already completed: return the stored response. */
  | { kind: 'replay'; status: number; body: unknown }
  /** Same key, but a different request payload. */
  | { kind: 'mismatch' }
  /** Same key is still being processed by another request. */
  | { kind: 'in-progress' };

/** JSON.stringify with object keys sorted, so key order in the payload doesn't matter. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function hashRequest(method: string, path: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method} ${path}\n${canonicalJson(body)}`)
    .digest('hex');
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async begin(
    tokenId: string,
    key: string,
    requestHash: string,
    attempt = 0,
  ): Promise<IdempotencyBegin> {
    const now = new Date();
    const recordId = randomUUID();

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          id: recordId,
          tokenId,
          key,
          requestHash,
          expiresAt: new Date(now.getTime() + IDEMPOTENCY_KEY_TTL_MS),
        },
      });
      return { kind: 'new', recordId };
    } catch (error) {
      // P2002 = unique constraint: this (token, key) pair is already stored.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tokenId_key: { tokenId, key } },
    });

    const expired = existing && existing.expiresAt <= now;
    const abandoned =
      existing &&
      existing.responseStatus === null &&
      now.getTime() - existing.createdAt.getTime() > IDEMPOTENCY_IN_PROGRESS_TIMEOUT_MS;

    // Row vanished between the failed insert and the read, or it is stale: start over (once).
    if (!existing || expired || abandoned) {
      if (attempt >= 1) {
        throw new ConflictException('Could not reserve the Idempotency-Key, please retry');
      }
      if (existing) {
        await this.prisma.idempotencyKey.deleteMany({ where: { id: existing.id } });
      }
      return this.begin(tokenId, key, requestHash, attempt + 1);
    }

    if (existing.requestHash !== requestHash) return { kind: 'mismatch' };
    if (existing.responseStatus === null) return { kind: 'in-progress' };

    return { kind: 'replay', status: existing.responseStatus, body: existing.responseBody };
  }

  /** Stores the successful response so retries can replay it. */
  async complete(recordId: string, status: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: {
        responseStatus: status,
        // Normalise Dates etc. to what the client actually received over the wire.
        responseBody: JSON.parse(JSON.stringify(body ?? null)) as Prisma.InputJsonValue,
      },
    });
  }

  /** Forgets a key whose request failed, so the client can fix the problem and retry. */
  async release(recordId: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({ where: { id: recordId } });
  }

  /** Housekeeping: delete keys past their TTL. Safe to call from a scheduled job. */
  async purgeExpired(): Promise<number> {
    const result = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return result.count;
  }
}
