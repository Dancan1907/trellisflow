import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

const KEY = '3f6f0f1e-5b52-4a4f-9a31-0d3f2b8a9c11';

const mockService = {
  begin: jest.fn(),
  complete: jest.fn(),
  release: jest.fn(),
};

function handlerWithStatus(status: number) {
  const handler = () => undefined;
  Reflect.defineMetadata(HTTP_CODE_METADATA, status, handler);
  return handler;
}

function buildContext(options: {
  headers?: Record<string, unknown>;
  apiToken?: { id: string } | null;
  body?: unknown;
}) {
  const request = {
    headers: options.headers ?? {},
    apiToken: options.apiToken === undefined ? { id: 'tok-1' } : options.apiToken,
    method: 'POST',
    originalUrl: '/v1/summary?x=1',
    body: options.body ?? { a: 1 },
  };
  const response = { setHeader: jest.fn() };

  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    getHandler: () => handlerWithStatus(201),
  } as unknown as ExecutionContext;

  return { context, response };
}

const run = async (
  interceptor: IdempotencyInterceptor,
  context: ExecutionContext,
  next: CallHandler,
) => lastValueFrom(await interceptor.intercept(context, next));

describe('IdempotencyInterceptor', () => {
  const interceptor = new IdempotencyInterceptor(mockService as unknown as IdempotencyService);
  let next: CallHandler;
  let handle: jest.Mock;

  beforeEach(() => {
    handle = jest.fn(() => of({ id: 'sum-1' }));
    next = { handle } as unknown as CallHandler;
    mockService.begin.mockResolvedValue({ kind: 'new', recordId: 'rec-1' });
    mockService.complete.mockResolvedValue(undefined);
    mockService.release.mockResolvedValue(undefined);
  });

  afterEach(() => jest.resetAllMocks());

  it('does nothing without an Idempotency-Key header', async () => {
    const { context } = buildContext({});

    await expect(run(interceptor, context, next)).resolves.toEqual({ id: 'sum-1' });
    expect(mockService.begin).not.toHaveBeenCalled();
  });

  it('rejects a key that is not a UUID', async () => {
    const { context } = buildContext({ headers: { 'idempotency-key': 'not-a-uuid' } });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
    expect(handle).not.toHaveBeenCalled();
  });

  it('passes through when the request was not authenticated by an API token', async () => {
    const { context } = buildContext({ headers: { 'idempotency-key': KEY }, apiToken: null });

    await expect(run(interceptor, context, next)).resolves.toEqual({ id: 'sum-1' });
    expect(mockService.begin).not.toHaveBeenCalled();
  });

  it('runs the handler and stores the response for a new key (key is lower-cased)', async () => {
    const { context } = buildContext({ headers: { 'idempotency-key': KEY.toUpperCase() } });

    await expect(run(interceptor, context, next)).resolves.toEqual({ id: 'sum-1' });

    expect(mockService.begin).toHaveBeenCalledWith(
      'tok-1',
      KEY,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(mockService.complete).toHaveBeenCalledWith('rec-1', 201, { id: 'sum-1' });
    expect(mockService.release).not.toHaveBeenCalled();
  });

  it('replays the stored response without running the handler', async () => {
    mockService.begin.mockResolvedValue({ kind: 'replay', status: 201, body: { id: 'first' } });
    const { context, response } = buildContext({ headers: { 'idempotency-key': KEY } });

    await expect(run(interceptor, context, next)).resolves.toEqual({ id: 'first' });

    expect(handle).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith('Idempotent-Replayed', 'true');
  });

  it('returns 422 when the key was used with a different payload', async () => {
    mockService.begin.mockResolvedValue({ kind: 'mismatch' });
    const { context } = buildContext({ headers: { 'idempotency-key': KEY } });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it('returns 409 while the first request is still in progress', async () => {
    mockService.begin.mockResolvedValue({ kind: 'in-progress' });
    const { context } = buildContext({ headers: { 'idempotency-key': KEY } });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(ConflictException);
    expect(handle).not.toHaveBeenCalled();
  });

  it('releases the key and rethrows when the handler fails', async () => {
    handle.mockReturnValue(throwError(() => new Error('boom')));
    const { context } = buildContext({ headers: { 'idempotency-key': KEY } });

    await expect(run(interceptor, context, next)).rejects.toThrow('boom');

    expect(mockService.release).toHaveBeenCalledWith('rec-1');
    expect(mockService.complete).not.toHaveBeenCalled();
  });

  it('still returns the response if storing it fails', async () => {
    mockService.complete.mockRejectedValue(new Error('db down'));
    const { context } = buildContext({ headers: { 'idempotency-key': KEY } });

    await expect(run(interceptor, context, next)).resolves.toEqual({ id: 'sum-1' });
    expect(mockService.release).toHaveBeenCalledWith('rec-1');
  });

  it('hashes the same payload identically regardless of key order', async () => {
    const first = buildContext({ headers: { 'idempotency-key': KEY }, body: { a: 1, b: 2 } });
    const second = buildContext({ headers: { 'idempotency-key': KEY }, body: { b: 2, a: 1 } });

    await run(interceptor, first.context, next);
    await run(interceptor, second.context, next);

    expect(mockService.begin.mock.calls[0][2]).toBe(mockService.begin.mock.calls[1][2]);
  });
});
