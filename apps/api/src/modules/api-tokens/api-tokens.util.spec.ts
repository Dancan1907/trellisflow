import { extractBearerToken, getTokenExpiry, hashApiToken } from './api-tokens.util';

const DAY = 24 * 60 * 60 * 1000;

describe('api-tokens.util', () => {
  describe('hashApiToken', () => {
    it('is a deterministic sha256 hex digest', () => {
      expect(hashApiToken('tf_live_abc')).toMatch(/^[0-9a-f]{64}$/);
      expect(hashApiToken('tf_live_abc')).toBe(hashApiToken('tf_live_abc'));
      expect(hashApiToken('tf_live_abc')).not.toBe(hashApiToken('tf_live_abd'));
    });
  });

  describe('extractBearerToken', () => {
    it('returns the token', () => {
      expect(extractBearerToken('Bearer tf_live_abc')).toBe('tf_live_abc');
    });

    it.each([undefined, '', 'Bearer', 'Bearer   ', 'Basic abc', 'bearer abc'])(
      'returns null for %p',
      (header) => {
        expect(extractBearerToken(header as string | undefined)).toBeNull();
      },
    );

    it('returns null for repeated headers (array)', () => {
      expect(extractBearerToken(['Bearer a', 'Bearer b'])).toBeNull();
    });
  });

  describe('getTokenExpiry', () => {
    const now = new Date('2026-11-20T12:00:00.000Z');

    it('is not expiring soon when more than 14 days remain', () => {
      const info = getTokenExpiry(new Date(now.getTime() + 15 * DAY), now);
      expect(info).toEqual({ expired: false, daysLeft: 15, expiringSoon: false });
    });

    it('is expiring soon at exactly 14 days', () => {
      const info = getTokenExpiry(new Date(now.getTime() + 14 * DAY), now);
      expect(info).toEqual({ expired: false, daysLeft: 14, expiringSoon: true });
    });

    it('rounds partial days up', () => {
      const info = getTokenExpiry(new Date(now.getTime() + 2 * DAY + 1), now);
      expect(info.daysLeft).toBe(3);
    });

    it('is expired (and not "expiring soon") once the time has passed', () => {
      const info = getTokenExpiry(new Date(now.getTime() - 1), now);
      expect(info).toEqual({ expired: true, daysLeft: 0, expiringSoon: false });
    });
  });
});
