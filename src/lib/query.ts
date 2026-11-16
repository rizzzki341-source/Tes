import { createElement, useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';
import { ApiError } from './anilist/client';
import { fetchAnime, fetchHome, fetchScheduleDay, fetchTracking, resolveSort, searchAnime } from './anilist/queries';
import type { AiringItem, Anime, AnimeDetail, HomeData, PageResult, SearchParams, TrackingData } from './anilist/types';
import { subscribedIds, useLibrary } from '../store/library';

const MINUTE = 60_000;
const DAY = 86_400_000;
export const CACHE_MAX_AGE_MS = 7 * DAY;
export const CACHE_KEY = 'myanime-query-cache';
export const TRACKING_WINDOW_MS = 30 * DAY;
const RATE_LIMIT_RETRY_CEILING_MS = 15_000;

export const queryKeys = {
  home: ['home'] as const,
  scheduleDay: (dayStartMs: number) => ['schedule', dayStartMs] as const,
  search: (params: SearchParams) =>
    [
      'search',
      {
        q: params.q.trim(),
        genre: params.genre,
        format: params.format,
        status: params.status,
        year: params.year,
        season: params.season,
        sort: resolveSort(params),
      },
    ] as const,
  anime: (id: number) => ['anime', id] as const,
  tracking: (ids: number[]) => ['tracking', [...ids].sort((a, b) => a - b)] as const,
};

/** network/server: two more tries. rate-limit: one, and only when the wait is short. Otherwise none. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === 'network' || error.kind === 'server') return failureCount < 2;
  if (error.kind === 'rate-limit') {
    return failureCount < 1 && error.retryAfterMs !== null && error.retryAfterMs <= RATE_LIMIT_RETRY_CEILING_MS;
  }
  return false;
}

export function retryDelay(attempt: number, error: unknown): number {
  if (error instanceof ApiError && error.kind === 'rate-limit' && error.retryAfterMs !== null) return error.retryAfterMs;
  return Math.min(1000 * 2 ** attempt, 8000);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: CACHE_MAX_AGE_MS,
        staleTime: 5 * MINUTE,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: 'offlineFirst',
        retry: shouldRetry,
        retryDelay,
      },
    },
  });
}

export function useHome(): UseQueryResult<HomeData, ApiError> {
  return useQuery<HomeData, ApiError>({
    queryKey: queryKeys.home,
    queryFn: ({ signal }) => fetchHome(Date.now(), signal),
    staleTime: 5 * MINUTE,
    refetchInterval: 5 * MINUTE,
  });
}

export function useScheduleDay(dayStartMs: number): UseQueryResult<AiringItem[], ApiError> {
  return useQuery<AiringItem[], ApiError>({
    queryKey: queryKeys.scheduleDay(dayStartMs),
    queryFn: ({ signal }) => fetchScheduleDay(dayStartMs, signal),
    staleTime: 5 * MINUTE,
  });
}

export function useSearch(params: SearchParams): UseInfiniteQueryResult<InfiniteData<PageResult<Anime>>, ApiError> {
  return useInfiniteQuery<PageResult<Anime>, ApiError, InfiniteData<PageResult<Anime>>, ReturnType<typeof queryKeys.search>, number>({
    queryKey: queryKeys.search(params),
    queryFn: ({ pageParam, signal }) => searchAnime(params, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    staleTime: 10 * MINUTE,
  });
}

export function useAnime(id: number): UseQueryResult<AnimeDetail, ApiError> {
  return useQuery<AnimeDetail, ApiError>({
    queryKey: queryKeys.anime(id),
    queryFn: ({ signal }) => fetchAnime(id, signal),
    staleTime: 10 * MINUTE,
  });
}

/** Fresh data and schedule rows for every subscribed title; idle while nothing is subscribed. */
export function useTracking(): UseQueryResult<TrackingData, ApiError> {
  // Selected as a string so unrelated library changes do not re-render subscribers.
  const idsKey = useLibrary((state) => subscribedIds(state.entries).join(','));
  const ids = idsKey === '' ? [] : idsKey.split(',').map(Number);
  return useQuery<TrackingData, ApiError>({
    queryKey: queryKeys.tracking(ids),
    queryFn: ({ signal }) => fetchTracking(ids, Date.now() - TRACKING_WINDOW_MS, signal),
    enabled: ids.length > 0,
    staleTime: 2 * MINUTE,
    placeholderData: keepPreviousData,
  });
}

function indexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function createPersister() {
  return createAsyncStoragePersister({
    key: CACHE_KEY,
    throttleTime: 1000,
    // A failing IndexedDB (private mode, full disk) must never break the app: reads act as a miss.
    storage: {
      getItem: async (key: string) => {
        try {
          return ((await get<string>(key)) ?? null) as string | null;
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await set(key, value);
        } catch {
          // Cache writes are best effort.
        }
      },
      removeItem: async (key: string) => {
        try {
          await del(key);
        } catch {
          // Nothing to clean up.
        }
      },
    },
  });
}

/**
 * Provides the query client. With IndexedDB the cache of successful queries survives restarts
 * (7 days, dropped when the app version changes); without it the cache lives in memory only.
 */
export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  const [persister] = useState(() => (indexedDbAvailable() ? createPersister() : null));

  if (!persister) return createElement(QueryClientProvider, { client: queryClient }, children);
  return createElement(
    PersistQueryClientProvider,
    {
      client: queryClient,
      persistOptions: {
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: __APP_VERSION__,
        dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' },
      },
    },
    children,
  );
}
