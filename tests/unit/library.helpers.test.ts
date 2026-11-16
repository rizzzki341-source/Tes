import { describe, expect, it } from 'vitest';
import {
  groupHistory,
  libraryTotals,
  libraryUrlParams,
  listEntries,
  nextEpisode,
  parseListFilter,
  parseTab,
  progressLabel,
  subscribedEntries,
} from '../../src/screens/library.helpers';
import type { HistoryItem, LibraryEntry } from '../../src/store/library';
import { anime, entry, snapshot, tracking } from './helpers';

const byId = (list: LibraryEntry[]): Record<string, LibraryEntry> => Object.fromEntries(list.map((e) => [String(e.id), e]));
const NOW = new Date(2026, 10, 16, 20, 0, 0).getTime();
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute, 0).getTime();
const item = (mediaId: number, episode: number, when: number): HistoryItem => ({ key: `${mediaId}:${episode}`, mediaId, episode, at: when });

describe('url state', () => {
  it('falls back to the first tab for anything unknown', () => {
    expect(parseTab(null)).toBe('langganan');
    expect(parseTab('riwayat')).toBe('riwayat');
    expect(parseTab('daftar')).toBe('daftar');
    expect(parseTab('Riwayat')).toBe('langganan');
    expect(parseTab('toString')).toBe('langganan');
  });

  it('falls back to "all" for an unknown list filter', () => {
    expect(parseListFilter(null)).toBe('all');
    expect(parseListFilter('watching')).toBe('watching');
    expect(parseListFilter('dropped')).toBe('all');
  });

  it('writes only what differs from the defaults', () => {
    expect(libraryUrlParams('langganan', 'all').toString()).toBe('');
    expect(libraryUrlParams('riwayat', 'done').toString()).toBe('tab=riwayat');
    expect(libraryUrlParams('daftar', 'all').toString()).toBe('tab=daftar');
    expect(libraryUrlParams('daftar', 'plan').toString()).toBe('tab=daftar&status=plan');
  });
});

describe('libraryTotals', () => {
  it('counts titles, watched episodes and subscriptions', () => {
    const entries = byId([
      entry(1, { watched: [1, 2, 3] }),
      entry(2, { subscribed: false, subscribedAt: null, list: 'plan' }),
      entry(3, { subscribed: false, subscribedAt: null, list: 'done', watched: [1, 2] }),
    ]);
    expect(libraryTotals(entries)).toEqual({ titles: 3, episodes: 5, subscribed: 1 });
    expect(libraryTotals({})).toEqual({ titles: 0, episodes: 0, subscribed: 0 });
  });
});

describe('subscribedEntries', () => {
  it('lists subscriptions newest first and leaves the rest out', () => {
    const entries = byId([
      entry(1, { subscribedAt: 100 }),
      entry(2, { subscribedAt: 300 }),
      entry(3, { subscribed: false, subscribedAt: null, list: 'plan' }),
      entry(4, { subscribedAt: 200 }),
    ]);
    expect(subscribedEntries(entries).map((e) => e.id)).toEqual([2, 4, 1]);
  });
});

describe('listEntries', () => {
  const entries = byId([
    entry(1, { list: 'plan', updatedAt: 10 }),
    entry(2, { list: 'watching', updatedAt: 30 }),
    entry(3, { list: 'done', updatedAt: 20 }),
    entry(4, { list: null, updatedAt: 99 }),
    entry(5, { list: 'watching', updatedAt: 5 }),
  ]);

  it('shows every listed title, most recently updated first', () => {
    expect(listEntries(entries, 'all').map((e) => e.id)).toEqual([2, 3, 1, 5]);
  });

  it('filters by list status', () => {
    expect(listEntries(entries, 'watching').map((e) => e.id)).toEqual([2, 5]);
    expect(listEntries(entries, 'plan').map((e) => e.id)).toEqual([1]);
    expect(listEntries(byId([entry(4)]), 'done')).toEqual([]);
  });
});

describe('nextEpisode', () => {
  const nowSec = Math.floor(NOW / 1000);

  it('is null without tracking data', () => {
    expect(nextEpisode(1, undefined, NOW)).toBeNull();
  });

  it('picks the soonest episode that has not aired yet', () => {
    const data = tracking(
      [anime(1)],
      [
        { mediaId: 1, episode: 7, airingAt: nowSec - 3600 },
        { mediaId: 1, episode: 9, airingAt: nowSec + 8 * 86400 },
        { mediaId: 1, episode: 8, airingAt: nowSec + 86400 },
        { mediaId: 2, episode: 3, airingAt: nowSec + 60 },
      ],
    );
    expect(nextEpisode(1, data, NOW)).toEqual({ episode: 8, atMs: (nowSec + 86400) * 1000 });
  });

  it("falls back to the title's own next airing", () => {
    const data = tracking([anime(1, { nextAiring: { episode: 4, airingAt: nowSec + 7200 } })], []);
    expect(nextEpisode(1, data, NOW)).toEqual({ episode: 4, atMs: (nowSec + 7200) * 1000 });
  });

  it('ignores an airing that is already in the past', () => {
    const data = tracking(
      [anime(1, { nextAiring: { episode: 4, airingAt: nowSec - 10 } })],
      [{ mediaId: 1, episode: 4, airingAt: nowSec - 10 }],
    );
    expect(nextEpisode(1, data, NOW)).toBeNull();
    expect(nextEpisode(99, data, NOW)).toBeNull();
  });
});

describe('progressLabel', () => {
  it('shows watched over total', () => {
    expect(progressLabel({ watched: [1, 2, 3], snapshot: snapshot(1) })).toEqual({ text: '3/12', spoken: '3 dari 12 episode ditonton' });
    expect(progressLabel({ watched: [], snapshot: snapshot(1) }).text).toBe('0/12');
  });

  it('counts episodes while the total is unknown', () => {
    expect(progressLabel({ watched: [1, 2], snapshot: snapshot(1, { episodes: null }) })).toEqual({
      text: '2 episode',
      spoken: '2 episode ditonton',
    });
  });
});

describe('groupHistory', () => {
  it('is empty for no history', () => {
    expect(groupHistory([], NOW)).toEqual([]);
  });

  it('groups by local day, newest first, whatever the stored order', () => {
    const history = [
      item(1, 1, at(14, 9)),
      item(1, 3, at(16, 19, 30)),
      item(2, 5, at(15, 23, 59)),
      item(1, 2, at(16, 0, 5)),
      item(3, 1, at(1, 12)),
    ];
    const groups = groupHistory(history, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Hari ini', 'Kemarin', '2 hari lalu', '1 Nov 2026']);
    expect(groups[0]!.items.map((h) => h.key)).toEqual(['1:3', '1:2']);
    expect(groups[1]!.items.map((h) => h.key)).toEqual(['2:5']);
    expect(history[0]!.key).toBe('1:1');
  });
});
