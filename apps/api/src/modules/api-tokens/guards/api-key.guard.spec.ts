import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiTokensService } from '../api-tokens.service';

const DAY = 24 * 60 * 60 * 1000;

function buildContext(authorization?: string) {
  const request: Record<string, any> = { headers: authorization ? { authorization } : {} };
  const response = { setHeader: jest.fn() };

  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;

  return { context, request, response };
}

describe('ApiKeyGuard', () => {
  const validateToken = jest.fn();
  const guard = new ApiKeyGuard({ validateToken } as unknown as ApiTokensService);

  afterEach(() => jest.clearAllMocks());

  it('rejects a missing Authorization header', async () => {
    const { context } = buildContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer header', async () => {
    const { context } = buildContext('Basic abc');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('rejects an empty Bearer token', async () => {
    const { context } = buildContext('Bearer    ');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('attaches the business and token to the request', async () => {
    const token = {
      id: 't1',
      expiresAt: new Date(Date.now() + 60 * DAY),
      container: { id: 'biz-1' },
    };
    validateToken.mockResolvedValue(token);
    const { context, request } = buildContext('Bearer tf_live_abc');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(validateToken).toHaveBeenCalledWith('tf_live_abc');
    expect(request.container).toEqual({ id: 'biz-1' });
    expect(request.apiToken).toBe(token);
  });

  it('always reports when the token expires, with no warning when far away', async () => {
    const expiresAt = new Date(Date.now() + 60 * DAY);
    validateToken.mockResolvedValue({ id: 't1', expiresAt, container: {} });
    const { context, response } = buildContext('Bearer tf_live_abc');

    await guard.canActivate(context);

    expect(response.setHeader).toHaveBeenCalledWith('X-Token-Expires-At', expiresAt.toISOString());
    expect(response.setHeader).not.toHaveBeenCalledWith(
      'X-Token-Expiry-Warning',
      expect.anything(),
    );
  });

  it('adds a warning header when the token expires within 14 days', async () => {
    validateToken.mockResolvedValue({
      id: 't1',
      expiresAt: new Date(Date.now() + 3 * DAY - 1000),
      container: {},
    });
    const { context, response } = buildContext('Bearer tf_live_abc');

    await guard.canActivate(context);

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Token-Expiry-Warning',
      expect.stringContaining('3 day(s)'),
    );
  });

  it('propagates validation failures', async () => {
    validateToken.mockRejectedValue(new UnauthorizedException('Invalid API token'));
    const { context, response } = buildContext('Bearer nope');

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid API token');
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
