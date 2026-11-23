import { ExecutionContext } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';
import { extractBearerToken, hashApiToken } from './api-tokens.util';

/** Requests per minute allowed for ONE API token. */
export const API_TOKEN_RATE_LIMIT = 60;
/** Per-IP backstop for requests carrying an API token (covers many tokens behind one IP). */
export const API_TOKEN_IP_RATE_LIMIT = 300;
export const API_TOKEN_RATE_TTL_MS = 60_000;

/** Name of the extra IP backstop throttler registered in AppModule. */
export const API_IP_THROTTLER = 'api-ip';

function hasApiToken(req: Record<string, any>): boolean {
  const token = extractBearerToken(req?.headers?.authorization);
  return !!token && token.startsWith('tf_');
}

/**
 * Throttler tracker: one bucket per API token (by hash, so the raw token never sits in
 * memory as a key). Requests without a bearer token fall back to the client IP.
 */
export function apiTokenTracker(req: Record<string, any>): string {
  const token = extractBearerToken(req?.headers?.authorization);
  if (token) return `api-token:${hashApiToken(token)}`;
  return req?.ips?.length ? req.ips[0] : req?.ip;
}

/**
 * IP backstop. Only applies to requests that carry an API token, so the rest of the API
 * keeps using the normal per-IP default throttler.
 */
export const apiIpThrottler: ThrottlerOptions = {
  name: API_IP_THROTTLER,
  ttl: API_TOKEN_RATE_TTL_MS,
  limit: API_TOKEN_IP_RATE_LIMIT,
  skipIf: (context: ExecutionContext) => !hasApiToken(context.switchToHttp().getRequest()),
};
