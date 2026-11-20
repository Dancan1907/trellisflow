import { createHash } from 'crypto';
import { MS_PER_DAY, TOKEN_EXPIRY_WARNING_DAYS } from './api-tokens.constants';

/** SHA-256 hex digest. Raw API tokens are never stored, only this hash. */
export function hashApiToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Returns the token from an `Authorization: Bearer <token>` header, or null. */
export function extractBearerToken(header?: string | string[]): string | null {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export interface TokenExpiryInfo {
  expired: boolean;
  /** Whole days left, rounded up (0 once expired). */
  daysLeft: number;
  /** Still valid, but inside the warning window. */
  expiringSoon: boolean;
}

export function getTokenExpiry(expiresAt: Date, now: Date = new Date()): TokenExpiryInfo {
  const msLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.max(Math.ceil(msLeft / MS_PER_DAY), 0);

  return {
    expired: msLeft <= 0,
    daysLeft,
    expiringSoon: msLeft > 0 && daysLeft <= TOKEN_EXPIRY_WARNING_DAYS,
  };
}
