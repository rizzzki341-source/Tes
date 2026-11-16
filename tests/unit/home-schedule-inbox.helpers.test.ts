import { describe, expect, it } from 'vitest';
import { continueLabel, continueWatching, latestPerAnime, progressLabel, seasonSearchPath } from '../../src/screens/home.helpers';
import { parseDayIndex, sortAirings, isFinale, episodeCountLabel } from '../../src/screens/schedule.helpers';
import { alertWhenLabel, countUnread, isUnread } from '../../src/screens/inbox.helpers';
import type { AiringItem } from '../../src/lib/anilist/types';
import { anime, entry, snapshot } from './helpers';

const airing = (id: number, mediaId: number, episode: number, airingAt: number, episodes: number | null = 12): AiringItem => ({
  id,
  episode,
  airingAt,
  anime: anime(mediaId, { episodes }),
});

describe('home helpers', () => {
  it('lists titles in progress, most recently touched first', () => {
    const items = continueWatching([
      entry(1, { list: 'watching', watched: [], updatedAt: 10 }),
      entry(2, { list: 'plan', watched: [1, 2], updatedAt: 30 }),
      entry(3, { list: 'done', watched: [1, 2, 3], updatedAt: 40 }),
      entry(4, { list: 'plan', watched: [], updatedAt: 50 }),
      entry(5, { list: null, watched: [1], updatedAt: 20 }),
    ]);
    expect(items.map((item) => item.entry.id)).toEqual([2, 5, 1]);
    expect(items.map((item) => item.next)).toEqual([3, 2, 1]);
  });

  it('picks the smallest unwatched episode and stops at the known count', () => {
    const gap = continueWatching([entry(1, { list: 'watching', watched: [1, 2, 4] })])[0]!;
    expect(continueLabel(gap)).toBe('Lanjut Ep 3');
    const complete = continueWatching([entry(2, { list: 'watching', watched: [1, 2], snapshot: snapshot(2, { episodes: 2 }) })])[0]!;
    expect(complete.next).toBeNull();
    expect(continueLabel(complete)).toBe('Semua episode sudah ditonton');
    const unknownTotal = continueWatching([entry(3, { list: 'watching', watched: [1], snapshot: snapshot(3, { episodes: null }) })])[0]!;
    expect(continueLabel(unknownTotal)).toBe('Lanjut Ep 2');
    expect(progressLabel(unknownTotal.entry)).toBe('1 episode ditonton');
    expect(progressLabel(gap.entry)).toBe('3 dari 12 episode');
  });

  it('caps the rail', () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(i + 1, { list: 'watching' }));
    expect(continueWatching(many)).toHaveLength(12);
  });

  it('keeps only the newest airing per anime, newest first', () => {
    const items = latestPerAnime([airing(1, 7, 3, 300), airing(2, 8, 1, 500), airing(3, 7, 4, 400), airing(4, 7, 2, 200)]);
    expect(items.map((item) => [item.anime.id, item.episode])).toEqual([
      [8, 1],
      [7, 4],
    ]);
  });

  it('links "Musim ini" to the current season', () => {
    expect(seasonSearchPath(new Date(2026, 10, 16).getTime())).toBe('/cari?season=FALL&year=2026&sort=POPULARITY_DESC');
    expect(seasonSearchPath(new Date(2027, 0, 2).getTime())).toBe('/cari?season=WINTER&year=2027&sort=POPULARITY_DESC');
  });
});

describe('schedule helpers', () => {
  it('reads the day from the URL and falls back to today', () => {
    expect(parseDayIndex('0')).toBe(0);
    expect(parseDayIndex('6')).toBe(6);
    for (const bad of [null, '', '7', '-1', '1.5', '01', 'besok']) expect(parseDayIndex(bad)).toBe(0);
  });

  it('sorts rows by air time without touching the input', () => {
    const input = [airing(1, 5, 1, 300), airing(2, 4, 1, 100), airing(3, 3, 1, 300)];
    expect(sortAirings(input).map((item) => item.id)).toEqual([2, 3, 1]);
    expect(input.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('flags the last episode only when the total is known', () => {
    expect(isFinale(airing(1, 5, 12, 0))).toBe(true);
    expect(isFinale(airing(1, 5, 11, 0))).toBe(false);
    expect(isFinale(airing(1, 5, 12, 0, null))).toBe(false);
  });

  it('labels the episode count', () => {
    expect(episodeCountLabel(12, 12, false)).toBe('12 episode');
    expect(episodeCountLabel(2, 12, true)).toBe('2 dari 12 episode');
  });
});

describe('inbox helpers', () => {
  it('counts items newer than the read mark', () => {
    expect(isUnread({ atMs: 101 }, 100)).toBe(true);
    expect(isUnread({ atMs: 100 }, 100)).toBe(false);
    expect(countUnread([{ atMs: 50 }, { atMs: 150 }, { atMs: 250 }], 100)).toBe(2);
  });

  it('says when a planned alert rings', () => {
    const now = new Date(2026, 10, 16, 20, 0).getTime();
    expect(alertWhenLabel(new Date(2026, 10, 16, 21, 30).getTime(), now)).toBe('Hari ini, 21.30');
    expect(alertWhenLabel(new Date(2026, 10, 17, 0, 5).getTime(), now)).toBe('Besok, 00.05');
    expect(alertWhenLabel(new Date(2026, 10, 19, 9, 0).getTime(), now)).toBe('19 Nov 2026, 09.00');
  });
});
