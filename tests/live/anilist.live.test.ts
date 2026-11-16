// Smoke test against the real AniList API. Run with `npm run test:live`, never as part of `npm test`.
// The API allows 30 requests/minute: each fetcher is called once (the schedule may need 2-3 pages).
import { describe, expect, it } from 'vitest';
import { fetchAnime, fetchHome, fetchScheduleDay, fetchTracking, searchAnime } from '../../src/lib/anilist/queries';
import type { Anime } from '../../src/lib/anilist/types';
import { startOfLocalDay } from '../../src/lib/time';

const NOW = Date.now();
const KNOWN_ID = 21; // a long-running series
/** A title that aired within the last three days; filled in by the home test. */
let recentlyAiredId: number | null = null;

function expectAnime(anime: Anime): void {
  expect(Number.isInteger(anime.id) && anime.id > 0).toBe(true);
  expect(anime.title.romaji ?? anime.title.english ?? anime.title.native).toBeTruthy();
  for (const url of [anime.cover, anime.coverSmall, anime.banner]) {
    if (url !== null) expect(url.startsWith('https://')).toBe(true);
  }
  expect(Array.isArray(anime.genres)).toBe(true);
  expect(anime.genres).not.toContain('Hentai');
  if (anime.score !== null) expect(anime.score).toBeGreaterThanOrEqual(0);
  if (anime.nextAiring) expect(anime.nextAiring.episode).toBeGreaterThan(0);
}

describe('AniList live API', () => {
  it('fetchHome returns every rail in one request', async () => {
    const home = await fetchHome(NOW);
    for (const key of ['trending', 'season', 'movies', 'top'] as const) {
      expect(home[key].length, key).toBeGreaterThan(0);
      home[key].forEach(expectAnime);
    }
    home.upcoming.forEach(expectAnime);
    expect(home.movies.every((a) => a.format === 'MOVIE')).toBe(true);

    expect(home.latest.length).toBeGreaterThan(0);
    for (const item of home.latest) {
      expectAnime(item.anime);
      expect(item.episode).toBeGreaterThan(0);
      expect(item.airingAt * 1000).toBeLessThanOrEqual(NOW + 60_000);
      expect(item.airingAt * 1000).toBeGreaterThan(NOW - 3 * 86_400_000 - 60_000);
    }
    const times = home.latest.map((i) => i.airingAt);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    recentlyAiredId = home.latest[0]?.anime.id ?? null;
  });

  it('fetchScheduleDay returns today in time order, inside the day', async () => {
    const dayStart = startOfLocalDay(NOW);
    const items = await fetchScheduleDay(dayStart);
    expect(items.length).toBeGreaterThan(0);
    const times = items.map((i) => i.airingAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) {
      expectAnime(item.anime);
      expect(item.airingAt * 1000).toBeGreaterThanOrEqual(dayStart);
      expect(item.airingAt * 1000).toBeLessThan(dayStart + 25 * 3_600_000);
    }
  });

  it('searchAnime finds a title and paginates', async () => {
    const result = await searchAnime(
      { q: 'one piece', genre: null, format: 'TV', status: null, year: null, season: null, sort: 'SEARCH_MATCH' },
      1,
    );
    expect(result.page).toBe(1);
    expect(typeof result.hasNext).toBe('boolean');
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach(expectAnime);
    expect(result.items.some((a) => a.id === KNOWN_ID)).toBe(true);
  });

  it('fetchAnime returns a cleaned detail record', async () => {
    const detail = await fetchAnime(KNOWN_ID);
    expectAnime(detail);
    expect(detail.id).toBe(KNOWN_ID);
    expect(detail.description.length).toBeGreaterThan(20);
    expect(detail.description).not.toMatch(/<\/?[a-z][^>]*>/i);
    expect(detail.siteUrl.startsWith('https://')).toBe(true);
    expect(detail.startDate).toMatch(/^\d{4}(-\d{2}){0,2}$/);
    expect(detail.studios.length).toBeGreaterThan(0);
    for (const link of detail.links) {
      expect(link.url.startsWith('https://')).toBe(true);
      expect(link.site).toBeTruthy();
    }
    for (const episode of detail.officialEpisodes) expect(episode.url.startsWith('https://')).toBe(true);
    for (const slot of detail.upcoming) expect(slot.airingAt * 1000).toBeGreaterThan(NOW - 3_600_000);
    detail.relations.forEach((r) => {
      expect(r.relation).toBeTruthy();
      expectAnime(r.anime);
    });
    detail.recommendations.forEach(expectAnime);
    if (detail.trailerYoutubeId !== null) expect(detail.trailerYoutubeId).toMatch(/^[A-Za-z0-9_-]{6,64}$/);
  });

  it('fetchAnime maps an id that does not exist to not-found', async () => {
    await expect(fetchAnime(999_999_999)).rejects.toMatchObject({ name: 'ApiError', kind: 'not-found' });
  });

  it('fetchTracking returns the titles with aired and upcoming slots', async () => {
    const since = NOW - 30 * 86_400_000;
    const ids = recentlyAiredId === null ? [KNOWN_ID] : [KNOWN_ID, recentlyAiredId];
    const data = await fetchTracking(ids, since);
    expect(data.anime.map((a) => a.id).sort((a, b) => a - b)).toEqual([...new Set(ids)].sort((a, b) => a - b));
    data.anime.forEach(expectAnime);
    const times = data.airing.map((a) => a.airingAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const slot of data.airing) {
      expect(ids).toContain(slot.mediaId);
      expect(slot.episode).toBeGreaterThan(0);
      expect(slot.airingAt * 1000).toBeGreaterThan(since - 60_000);
    }
    // The title taken from "latest" aired within three days, so its aired slot must be here.
    if (recentlyAiredId !== null) {
      const aired = data.airing.filter((a) => a.mediaId === recentlyAiredId && a.airingAt * 1000 <= NOW);
      expect(aired.length).toBeGreaterThan(0);
    }
  });
});
