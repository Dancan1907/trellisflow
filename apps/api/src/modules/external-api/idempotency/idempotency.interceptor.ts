import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { isUUID } from 'class-validator';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { IdempotencyService, hashRequest } from './idempotency.service';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENT_REPLAYED_HEADER = 'Idempotent-Replayed';

/**
 * Makes POST endpoints safe to retry.
 *
 * If the request has an `Idempotency-Key: <uuid>` header, the first successful response is
 * stored. Sending the same key with the same payload again returns that stored response
 * (with an `Idempotent-Replayed: true` header) instead of running the request twice.
 *
 * - Same key + different payload  -> 422
 * - Same key while the first request is still running -> 409
 * - Failed requests (4xx/5xx) are NOT stored, so the client can fix the request and retry.
 * - Without the header the request is processed normally.
 *
 * Must run after ApiKeyGuard (needs `request.apiToken`). Keys are scoped per API token.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const headerValue = request.headers?.[IDEMPOTENCY_HEADER];
    if (headerValue === undefined) {
      return next.handle();
    }

    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof key !== 'string' || !isUUID(key)) {
      throw new BadRequestException('Idempotency-Key header must be a UUID');
    }

    const tokenId: string | undefined = request.apiToken?.id;
    if (!tokenId) {
      // Not authenticated through an API token: nothing to scope the key to.
      return next.handle();
    }

    const path = String(request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';
    const requestHash = hashRequest(request.method, path, request.body);
    const normalizedKey = key.toLowerCase();

    const state = await this.idempotency.begin(tokenId, normalizedKey, requestHash);

    switch (state.kind) {
      case 'replay':
        response.setHeader(IDEMPOTENT_REPLAYED_HEADER, 'true');
        return of(state.body);

      case 'mismatch':
        throw new UnprocessableEntityException(
          'This Idempotency-Key was already used with a different request payload',
        );

      case 'in-progress':
        throw new ConflictException(
          'A request with this Idempotency-Key is still being processed, retry shortly',
        );
    }

    const status: number = Reflect.getMetadata(HTTP_CODE_METADATA, context.getHandler()) ?? 200;

    return next.handle().pipe(
      // 1. The handler failed: forget the key so the client can fix the request and retry.
      catchError((error) =>
        from(this.idempotency.release(state.recordId).catch(() => undefined)).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
      // 2. The handler succeeded: remember the response. Never fail a request that worked.
      mergeMap((body) => from(this.remember(state.recordId, status, body)).pipe(map(() => body))),
    );
  }

  private async remember(recordId: string, status: number, body: unknown): Promise<void> {
    try {
      await this.idempotency.complete(recordId, status, body);
    } catch {
      // If we cannot store the response, drop the key; a retry will simply run again and the
      // date+unit duplicate check still protects against double-creating a summary.
      await this.idempotency.release(recordId).catch(() => undefined);
    }
  }
}
