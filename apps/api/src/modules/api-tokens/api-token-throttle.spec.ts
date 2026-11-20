import { ExecutionContext } from '@nestjs/common';
import { apiIpThrottler, apiTokenTracker } from './api-token-throttle';
import { hashApiToken } from './api-tokens.util';

const req = (authorization?: string, extra: Record<string, unknown> = {}) => ({
  headers: authorization ? { authorization } : {},
  ip: '10.0.0.1',
  ips: [],
  ...extra,
});

const contextFor = (request: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe('apiTokenTracker', () => {
  it('uses a separate bucket per token, even from the same IP', () => {
    const a = apiTokenTracker(req('Bearer tf_live_aaa'));
    const b = apiTokenTracker(req('Bearer tf_live_bbb'));

    expect(a).not.toBe(b);
    expect(a).toBe(apiTokenTracker(req('Bearer tf_live_aaa', { ip: '10.9.9.9' })));
  });

  it('keys by hash, never by the raw token', () => {
    const key = apiTokenTracker(req('Bearer tf_live_secret'));

    expect(key).toBe(`api-token:${hashApiToken('tf_live_secret')}`);
    expect(key).not.toContain('tf_live_secret');
  });

  it('falls back to the client IP without a bearer token', () => {
    expect(apiTokenTracker(req())).toBe('10.0.0.1');
  });

  it('prefers the first forwarded IP when behind a proxy', () => {
    expect(apiTokenTracker(req(undefined, { ips: ['203.0.113.7', '10.0.0.1'] }))).toBe(
      '203.0.113.7',
    );
  });
});

describe('apiIpThrottler.skipIf', () => {
  const skipIf = apiIpThrottler.skipIf as (context: ExecutionContext) => boolean;

  it('applies to requests carrying a tf_ token', () => {
    expect(skipIf(contextFor(req('Bearer tf_live_abc')))).toBe(false);
  });

  it('is skipped for dashboard (JWT) and anonymous requests', () => {
    expect(skipIf(contextFor(req('Bearer eyJhbGciOi.payload.sig')))).toBe(true);
    expect(skipIf(contextFor(req()))).toBe(true);
  });
});
