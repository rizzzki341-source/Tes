import { abortError, apiLimiter } from './limiter';

export const ANILIST_URL = 'https://graphql.anilist.co';
const DEFAULT_RETRY_AFTER_MS = 60_000;

export type ApiErrorKind = 'network' | 'rate-limit' | 'server' | 'not-found' | 'graphql';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number | null;
  retryAfterMs: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

interface GraphQLBody<T> {
  data?: T | null;
  errors?: { message?: string; status?: number }[] | null;
}

function retryAfterMs(response: Response): number {
  const header = response.headers.get('Retry-After');
  const seconds = header === null ? NaN : Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : DEFAULT_RETRY_AFTER_MS;
}

function fromStatus(status: number, response: Response | null, message: string): ApiError | null {
  if (status === 429) {
    return new ApiError('rate-limit', message, status, response ? retryAfterMs(response) : DEFAULT_RETRY_AFTER_MS);
  }
  if (status === 404) return new ApiError('not-found', message, status);
  // AniList answers 403 while the API is switched off during incidents.
  if (status >= 500 || status === 403) return new ApiError('server', message, status);
  return null;
}

export function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  return apiLimiter.schedule(async () => {
    if (signal?.aborted) throw abortError();

    let response: Response;
    try {
      response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      });
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw isAbortError(error) ? error : abortError();
      throw new ApiError('network', error instanceof Error ? error.message : 'Network request failed');
    }

    const statusError = fromStatus(response.status, response, `AniList responded with HTTP ${response.status}`);
    if (statusError) throw statusError;

    let body: GraphQLBody<T>;
    try {
      body = (await response.json()) as GraphQLBody<T>;
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ApiError('graphql', 'AniList sent a response that is not JSON', response.status);
    }

    const first = Array.isArray(body?.errors) ? body.errors[0] : undefined;
    if (first) {
      const message = typeof first.message === 'string' ? first.message : 'GraphQL error';
      const mapped = typeof first.status === 'number' ? fromStatus(first.status, null, message) : null;
      throw mapped ?? new ApiError('graphql', message, response.status);
    }
    if (!response.ok) throw new ApiError('graphql', `AniList responded with HTTP ${response.status}`, response.status);
    if (body === null || typeof body !== 'object' || body.data === null || body.data === undefined) {
      throw new ApiError('graphql', 'AniList sent an empty response', response.status);
    }
    return body.data;
  }, signal);
}
