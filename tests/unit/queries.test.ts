process.env.TZ = 'Asia/Jakarta';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiLimiter } from '../../src/lib/anilist/limiter';
import {
  SCHEDULE_MAX_PAGES,
  TRACKING_MAX_IDS,
  fetchAnime,
  fetchHome,
  fetchScheduleDay,
  fetchTracking,
  resolveSort,
  searchAnime,
  searchVariables,
} from '../../src/lib/anilist/queries';
import type { SearchParams } from '../../src/lib/anilist/types';
import { jsonResponse, rawMedia } from './helpers';

const fetchMock = vi.fn<typeof fetch>();
const NOW = new Date(2026, 10, 16, 20, 0, 0).getTime();
const NOW_S = Math.floor(NOW / 1000);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  apiLimiter.reset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function run<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

const sent = (call = 0) => JSON.parse(String(fetchMock.mock.calls[call]![1]?.body)) as { query: string; variables: Record<string, unknown> };
const params = (extra: Partial<SearchParams> = {}): SearchParams => ({
  q: '',
  genre: null,
  format: null,
  status: null,
  year: null,
  season: null,
  sort: 'POPULARITY_DESC',
  ...extra,
});

describe('fetchHome', () => {
  it('asks for the current and next season and the last three days in one request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await run(fetchHome(NOW));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().variables).toEqual({
      season: 'FALL',
      year: 2026,
      nextSeason: 'WINTER',
      nextYear: 2027,
      now: NOW_S,
      since: NOW_S - 3 * 86_400,
    });
    expect(sent().query).toContain('isAdult: false');
  });

  it('drops airings whose media is missing, adult or not anime', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          trending: { media: [rawMedia(1), rawMedia(2, { isAdult: true })] },
          latest: {
            airingSchedules: [
              { id: 1, episode: 3, airingAt: NOW_S - 60, media: rawMedia(10) },
              { id: 2, episode: 1, airingAt: NOW_S - 120, media: null },
              { id: 3, episode: 1, airingAt: NOW_S - 180, media: rawMedia(11, { isAdult: true }) },
              { id: 4, episode: 1, airingAt: NOW_S - 240, media: rawMedia(12, { type: 'MANGA' }) },
            ],
          },
          season: { media: [rawMedia(3)] },
          upcoming: null,
          movies: { media: null },
        },
      }),
    );
    const home = await run(fetchHome(NOW));
    expect(home.trending.map((a) => a.id)).toEqual([1]);
    expect(home.latest.map((a) => a.anime.id)).toEqual([10]);
    expect(home.season.map((a) => a.id)).toEqual([3]);
    expect(home.upcoming).toEqual([]);
    expect(home.movies).toEqual([]);
    expect(home.top).toEqual([]);
  });
});

describe('fetchScheduleDay', () => {
  const dayStart = new Date(2026, 10, 17).getTime();
  const page = (ids: number[], hasNextPage: boolean) =>
    jsonResponse({
      data: {
        Page: {
          pageInfo: { hasNextPage },
          airingSchedules: ids.map((id) => ({ id, episode: 1, airingAt: Math.floor(dayStart / 1000) + 1000 - id, media: rawMedia(id) })),
        },
      },
    });

  it('queries the local day as a half-open range', async () => {
    fetchMock.mockResolvedValue(page([1], false));
    await run(fetchScheduleDay(dayStart));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Exclusive bounds: one second before midnight up to the next midnight.
    expect(sent().variables).toEqual({ from: dayStart / 1000 - 1, to: dayStart / 1000 + 86_400, page: 1 });
  });

  it('follows hasNextPage and returns everything sorted by air time', async () => {
    fetchMock.mockResolvedValueOnce(page([1, 2], true)).mockResolvedValueOnce(page([3], false));
    const items = await run(fetchScheduleDay(dayStart));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(1).variables.page).toBe(2);
    expect(items.map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it('stops after the page limit even if the API keeps saying there is more', async () => {
    fetchMock.mockImplementation(async () => page([Math.floor(Math.random() * 1e6) + 1], true));
    await run(fetchScheduleDay(dayStart));
    expect(fetchMock).toHaveBeenCalledTimes(SCHEDULE_MAX_PAGES);
    expect(SCHEDULE_MAX_PAGES).toBe(4);
  });
});

describe('searchAnime', () => {
  it('omits filters that are not set', () => {
    expect(searchVariables(params(), 1)).toEqual({ page: 1, sort: ['POPULARITY_DESC'] });
    expect(searchVariables(params({ q: '   ' }), 3)).toEqual({ page: 3, sort: ['POPULARITY_DESC'] });
  });

  it('sends every filter that is set', () => {
    expect(
      searchVariables(params({ q: ' frieren ', genre: 'Fantasy', format: 'TV', status: 'FINISHED', year: 2023, season: 'FALL', sort: 'SCORE_DESC' }), 2),
    ).toEqual({ page: 2, search: 'frieren', genre: 'Fantasy', format: 'TV', status: 'FINISHED', year: 2023, season: 'FALL', sort: ['SCORE_DESC'] });
  });

  it('uses SEARCH_MATCH only together with a search term', () => {
    expect(resolveSort({ q: 'frieren', sort: 'SEARCH_MATCH' })).toBe('SEARCH_MATCH');
    expect(resolveSort({ q: '', sort: 'SEARCH_MATCH' })).toBe('POPULARITY_DESC');
    expect(resolveSort({ q: '  ', sort: 'SEARCH_MATCH' })).toBe('POPULARITY_DESC');
    expect(resolveSort({ q: '', sort: 'TRENDING_DESC' })).toBe('TRENDING_DESC');
    expect(resolveSort({ q: 'frieren', sort: 'START_DATE_DESC' })).toBe('START_DATE_DESC');
  });

  it('maps a page of results', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { Page: { pageInfo: { hasNextPage: true, currentPage: 2 }, media: [rawMedia(1), rawMedia(2, { isAdult: true })] } } }),
    );
    const result = await run(searchAnime(params({ q: 'one' }), 2));
    expect(result.page).toBe(2);
    expect(result.hasNext).toBe(true);
    expect(result.items.map((a) => a.id)).toEqual([1]);
    expect(sent().variables).toEqual({ page: 2, search: 'one', sort: ['POPULARITY_DESC'] });
  });

  it('handles an empty page', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { Page: null } }));
    await expect(run(searchAnime(params(), 1))).resolves.toEqual({ items: [], page: 1, hasNext: false });
  });
});

describe('fetchAnime', () => {
  it('maps the detail record', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { Media: { ...rawMedia(21), description: 'Halo<br>dunia' } } }));
    const detail = await run(fetchAnime(21));
    expect(detail).toMatchObject({ id: 21, description: 'Halo\ndunia' });
    expect(sent().variables).toEqual({ id: 21 });
  });

  it('reports not-found for a missing, adult or non-anime record', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { Media: null } }));
    await expect(run(fetchAnime(5))).rejects.toMatchObject({ kind: 'not-found' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { Media: rawMedia(5, { isAdult: true }) } }));
    await expect(run(fetchAnime(5))).rejects.toMatchObject({ kind: 'not-found' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'Not Found.', status: 404 }] }, { status: 404 }));
    await expect(run(fetchAnime(5))).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('does not spend a request on an id that cannot exist', async () => {
    await expect(run(fetchAnime(Number.NaN))).rejects.toMatchObject({ kind: 'not-found' });
    await expect(run(fetchAnime(-3))).rejects.toMatchObject({ kind: 'not-found' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchTracking', () => {
  it('returns empty data without a request when there are no ids', async () => {
    await expect(run(fetchTracking([], NOW))).resolves.toEqual({ anime: [], airing: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends unique ids once and merges aired and upcoming slots', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          media: { media: [rawMedia(21), rawMedia(30)] },
          aired: { airingSchedules: [{ id: 2, mediaId: 21, episode: 7, airingAt: NOW_S - 100 }] },
          next: {
            airingSchedules: [
              { id: 3, mediaId: 21, episode: 8, airingAt: NOW_S + 500 },
              { id: 4, mediaId: 30, episode: 2, airingAt: NOW_S + 200 },
            ],
          },
        },
      }),
    );
    const since = NOW - 30 * 86_400_000;
    const data = await run(fetchTracking([30, 21, 21, 0, -1], since));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().variables).toEqual({ ids: [30, 21], since: Math.floor(since / 1000) });
    expect(data.anime.map((a) => a.id)).toEqual([21, 30]);
    expect(data.airing).toEqual([
      { mediaId: 21, episode: 7, airingAt: NOW_S - 100 },
      { mediaId: 30, episode: 2, airingAt: NOW_S + 200 },
      { mediaId: 21, episode: 8, airingAt: NOW_S + 500 },
    ]);
  });

  it('caps the request at the newest ids', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    const ids = Array.from({ length: TRACKING_MAX_IDS + 10 }, (_, i) => i + 1);
    await run(fetchTracking(ids, NOW));
    const sentIds = sent().variables.ids as number[];
    expect(sentIds).toHaveLength(TRACKING_MAX_IDS);
    expect(Math.min(...sentIds)).toBe(11);
  });
});
