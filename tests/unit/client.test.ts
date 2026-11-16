import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANILIST_URL, ApiError, gql, isAbortError } from '../../src/lib/anilist/client';
import { apiLimiter } from '../../src/lib/anilist/limiter';
import { jsonResponse } from './helpers';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  apiLimiter.reset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Runs a request to completion (the limiter may hold it back) and returns the error it throws. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const caught = promise.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (error: unknown) => error as ApiError,
  );
  await vi.runAllTimersAsync();
  return caught;
}

describe('gql', () => {
  it('POSTs the query as JSON and returns `data` on 200', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { Page: { media: [] } } }));
    const controller = new AbortController();
    const result = gql<{ Page: { media: unknown[] } }>('query Q($id: Int) { x }', { id: 21 }, controller.signal);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual({ Page: { media: [] } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ANILIST_URL);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual({ query: 'query Q($id: Int) { x }', variables: { id: 21 } });
    expect(init?.signal).toBe(controller.signal);
  });

  it('maps 429 to rate-limit with Retry-After in milliseconds', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ errors: [{ message: 'Too Many Requests.', status: 429 }] }, { status: 429, headers: { 'Retry-After': '7' } }));
    const error = await failure(gql('q', {}));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'rate-limit', status: 429, retryAfterMs: 7000 });
  });

  it('falls back to 60 s when Retry-After is missing or unreadable', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 429 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'rate-limit', retryAfterMs: 60_000 });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 429, headers: { 'Retry-After': 'soon' } }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'rate-limit', retryAfterMs: 60_000 });
  });

  it('maps 404 to not-found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ errors: [{ message: 'Not Found.', status: 404 }], data: { Media: null } }, { status: 404 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'not-found', status: 404, retryAfterMs: null });
  });

  it('maps 5xx to server, even when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'server', status: 502 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'Internal Server Error' }] }, { status: 500 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'server', status: 500 });
  });

  it('maps a rejected fetch to network', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await failure(gql('q', {}));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'network', status: null });
  });

  it('maps GraphQL errors in a 200 body to graphql', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null, errors: [{ message: 'Cannot query field "nope" on type "Media".' }] }));
    const error = await failure(gql('q', {}));
    expect(error).toMatchObject({ kind: 'graphql', status: 200 });
    expect(error.message).toContain('nope');
  });

  it('honours an error status reported inside a 200 body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null, errors: [{ message: 'Not Found.', status: 404 }] }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'not-found' });
  });

  it('maps a 200 that is not JSON, or has no data, to graphql', async () => {
    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 200 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'graphql' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'graphql' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'Bad Request' }] }, { status: 400 }));
    expect(await failure(gql('q', {}))).toMatchObject({ kind: 'graphql', status: 400 });
  });

  it('lets an abort during the request propagate as AbortError, not ApiError', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const request = gql('q', {}, controller.signal);
    const caught = request.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.abort();
    const error = await caught;
    expect(error).not.toBeInstanceOf(ApiError);
    expect(isAbortError(error)).toBe(true);
  });

  it('does not call fetch at all when aborted while waiting for a slot', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const controller = new AbortController();
    const first = gql('q', {});
    const second = gql('q', {}, controller.signal);
    const caught = second.catch((error: unknown) => error);
    controller.abort();
    await vi.runAllTimersAsync();
    await expect(first).resolves.toEqual({ ok: true });
    expect(isAbortError(await caught)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('spaces consecutive requests by at least 300 ms', async () => {
    const calledAt: number[] = [];
    fetchMock.mockImplementation(async () => {
      calledAt.push(Date.now());
      return jsonResponse({ data: {} });
    });
    const all = Promise.all([gql('a', {}), gql('b', {}), gql('c', {})]);
    await vi.runAllTimersAsync();
    await all;
    expect(calledAt).toHaveLength(3);
    expect(calledAt[1]! - calledAt[0]!).toBeGreaterThanOrEqual(300);
    expect(calledAt[2]! - calledAt[1]!).toBeGreaterThanOrEqual(300);
  });
});
