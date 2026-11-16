// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  STORAGE_KEY,
  nextUnwatched,
  subscribedIds,
  toSnapshot,
  useLibrary,
} from '../../src/store/library';
import { anime, snapshot } from './helpers';

const T0 = 1_000_000;
const lib = () => useLibrary.getState();
const entryOf = (id: number) => lib().entries[String(id)];

beforeEach(() => {
  lib().resetAll();
});

describe('toggleSubscribe', () => {
  it('subscribes, records when, and returns the new state', () => {
    expect(lib().toggleSubscribe(snapshot(1), T0)).toBe(true);
    expect(entryOf(1)).toMatchObject({ id: 1, subscribed: true, subscribedAt: T0, list: null, watched: [], addedAt: T0, updatedAt: T0 });
  });

  it('unsubscribes and removes an entry that holds nothing else', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    expect(lib().toggleSubscribe(snapshot(1), T0 + 1)).toBe(false);
    expect(entryOf(1)).toBeUndefined();
  });

  it('keeps the entry when it is still on a list', () => {
    lib().setList(snapshot(1), 'plan', T0);
    lib().toggleSubscribe(snapshot(1), T0 + 1);
    lib().toggleSubscribe(snapshot(1), T0 + 2);
    expect(entryOf(1)).toMatchObject({ subscribed: false, subscribedAt: null, list: 'plan', addedAt: T0, updatedAt: T0 + 2 });
  });

  it('subscribing again starts a new subscribedAt', () => {
    lib().setList(snapshot(1), 'plan', T0);
    lib().toggleSubscribe(snapshot(1), T0 + 1);
    lib().toggleSubscribe(snapshot(1), T0 + 2);
    lib().toggleSubscribe(snapshot(1), T0 + 3);
    expect(entryOf(1)?.subscribedAt).toBe(T0 + 3);
  });

  it('saves only snapshot fields even when given a full anime', () => {
    lib().toggleSubscribe(anime(7, { genres: ['Action'], score: 90 }), T0);
    expect(Object.keys(entryOf(7)!.snapshot).sort()).toEqual(['cover', 'coverSmall', 'episodes', 'format', 'id', 'status', 'title']);
    expect(toSnapshot(anime(7))).toEqual(snapshot(7));
  });

  it('ignores an invalid id', () => {
    expect(lib().toggleSubscribe(snapshot(0), T0)).toBe(false);
    expect(lib().toggleSubscribe(snapshot(1.5), T0)).toBe(false);
    expect(lib().entries).toEqual({});
  });
});

describe('setList', () => {
  it('moves between statuses', () => {
    lib().setList(snapshot(1), 'plan', T0);
    expect(entryOf(1)?.list).toBe('plan');
    lib().setList(snapshot(1), 'watching', T0 + 1);
    expect(entryOf(1)?.list).toBe('watching');
    lib().setList(snapshot(1), 'done', T0 + 2);
    expect(entryOf(1)).toMatchObject({ list: 'done', addedAt: T0, updatedAt: T0 + 2 });
  });

  it('removing from the list deletes an otherwise empty entry', () => {
    lib().setList(snapshot(1), 'plan', T0);
    lib().setList(snapshot(1), null, T0 + 1);
    expect(entryOf(1)).toBeUndefined();
  });

  it('removing from the list keeps subscriptions and progress', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    lib().setWatched(snapshot(1), 1, true, T0 + 1);
    lib().setList(snapshot(1), null, T0 + 2);
    expect(entryOf(1)).toMatchObject({ subscribed: true, list: null, watched: [1] });
  });
});

describe('setWatched', () => {
  it('marks an episode, adds history and starts "watching"', () => {
    lib().setWatched(snapshot(1), 3, true, T0);
    expect(entryOf(1)).toMatchObject({ watched: [3], list: 'watching' });
    expect(lib().history).toEqual([{ key: '1:3', mediaId: 1, episode: 3, at: T0 }]);
  });

  it('moves "plan" to "watching" on the first watched episode', () => {
    lib().setList(snapshot(1), 'plan', T0);
    lib().setWatched(snapshot(1), 1, true, T0 + 1);
    expect(entryOf(1)?.list).toBe('watching');
  });

  it('does not touch a list that is already "done"', () => {
    lib().setList(snapshot(1), 'done', T0);
    lib().setWatched(snapshot(1), 1, true, T0 + 1);
    expect(entryOf(1)?.list).toBe('done');
  });

  it('watching the last known episode sets "done"', () => {
    lib().setWatched(snapshot(1, { episodes: 12 }), 11, true, T0);
    expect(entryOf(1)?.list).toBe('watching');
    lib().setWatched(snapshot(1, { episodes: 12 }), 12, true, T0 + 1);
    expect(entryOf(1)?.list).toBe('done');
  });

  it('does not guess "done" when the episode count is unknown', () => {
    lib().setWatched(snapshot(1, { episodes: null }), 1100, true, T0);
    expect(entryOf(1)?.list).toBe('watching');
  });

  it('keeps watched episodes sorted and unique', () => {
    lib().setWatched(snapshot(1), 5, true, T0);
    lib().setWatched(snapshot(1), 2, true, T0 + 1);
    lib().setWatched(snapshot(1), 5, true, T0 + 2);
    expect(entryOf(1)?.watched).toEqual([2, 5]);
  });

  it('re-watching moves the history item to the top instead of duplicating it', () => {
    lib().setWatched(snapshot(1), 1, true, T0);
    lib().setWatched(snapshot(1), 2, true, T0 + 1);
    lib().setWatched(snapshot(1), 1, true, T0 + 2);
    expect(lib().history.map((h) => [h.key, h.at])).toEqual([
      ['1:1', T0 + 2],
      ['1:2', T0 + 1],
    ]);
  });

  it('unmarking removes the episode and its history item', () => {
    lib().setWatched(snapshot(1), 1, true, T0);
    lib().setWatched(snapshot(1), 2, true, T0 + 1);
    lib().setWatched(snapshot(1), 1, false, T0 + 2);
    expect(entryOf(1)?.watched).toEqual([2]);
    expect(lib().history.map((h) => h.key)).toEqual(['1:2']);
  });

  it('unmarking the only episode of an unlisted title removes the entry', () => {
    lib().setWatched(snapshot(1), 1, true, T0);
    lib().setList(snapshot(1), null, T0 + 1);
    lib().setWatched(snapshot(1), 1, false, T0 + 2);
    expect(entryOf(1)).toBeUndefined();
    expect(lib().history).toEqual([]);
  });

  it('ignores episode numbers that make no sense', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, 1e9]) lib().setWatched(snapshot(1), bad, true, T0);
    expect(lib().entries).toEqual({});
    expect(lib().history).toEqual([]);
  });
});

describe('markWatchedThrough / clearProgress', () => {
  it('marks 1..N and writes a single history line', () => {
    lib().setWatched(snapshot(1), 9, true, T0);
    lib().markWatchedThrough(snapshot(1), 4, T0 + 1);
    expect(entryOf(1)?.watched).toEqual([1, 2, 3, 4, 9]);
    expect(lib().history.map((h) => h.key)).toEqual(['1:4', '1:9']);
  });

  it('marking through the last episode sets "done"', () => {
    lib().markWatchedThrough(snapshot(1, { episodes: 12 }), 12, T0);
    expect(entryOf(1)).toMatchObject({ list: 'done' });
    expect(entryOf(1)?.watched).toHaveLength(12);
  });

  it('clearProgress empties watched episodes and that title\'s history only', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    lib().markWatchedThrough(snapshot(1), 3, T0 + 1);
    lib().setWatched(snapshot(2), 1, true, T0 + 2);
    lib().clearProgress(1, T0 + 3);
    expect(entryOf(1)).toMatchObject({ watched: [], subscribed: true, updatedAt: T0 + 3 });
    expect(lib().history.map((h) => h.key)).toEqual(['2:1']);
  });

  it('clearProgress on an unknown title changes nothing', () => {
    lib().setWatched(snapshot(2), 1, true, T0);
    const before = lib().history;
    lib().clearProgress(99, T0 + 1);
    expect(lib().history).toBe(before);
  });
});

describe('history', () => {
  it('is capped at 500 items, newest first', () => {
    for (let episode = 1; episode <= HISTORY_LIMIT + 20; episode += 1) {
      lib().setWatched(snapshot(1, { episodes: null }), episode, true, T0 + episode);
    }
    expect(lib().history).toHaveLength(HISTORY_LIMIT);
    expect(lib().history[0]?.episode).toBe(HISTORY_LIMIT + 20);
    expect(lib().history.at(-1)?.episode).toBe(21);
    expect(entryOf(1)?.watched).toHaveLength(HISTORY_LIMIT + 20);
  });

  it('removeHistory drops one line and keeps the watched mark', () => {
    lib().setWatched(snapshot(1), 1, true, T0);
    lib().setWatched(snapshot(1), 2, true, T0 + 1);
    lib().removeHistory('1:1');
    expect(lib().history.map((h) => h.key)).toEqual(['1:2']);
    expect(entryOf(1)?.watched).toEqual([1, 2]);
  });

  it('clearHistory empties the list only', () => {
    lib().setWatched(snapshot(1), 1, true, T0);
    lib().clearHistory();
    expect(lib().history).toEqual([]);
    expect(entryOf(1)?.watched).toEqual([1]);
  });
});

describe('settings, inbox and bulk actions', () => {
  it('starts with the defaults', () => {
    expect(lib().settings).toEqual(DEFAULT_SETTINGS);
    expect(lib().inboxReadAt).toBe(0);
  });

  it('updateSettings patches one field at a time', () => {
    lib().updateSettings({ titleLang: 'english' });
    lib().updateSettings({ dataSaver: true });
    expect(lib().settings).toEqual({ titleLang: 'english', alerts: true, dataSaver: true });
  });

  it('markInboxRead stores the time', () => {
    lib().markInboxRead(T0);
    expect(lib().inboxReadAt).toBe(T0);
  });

  it('replaceAll swaps the data and resetAll clears it', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    const saved = { entries: lib().entries, history: lib().history, settings: { ...lib().settings, alerts: false }, inboxReadAt: 5 };
    lib().resetAll();
    expect(lib().entries).toEqual({});
    lib().replaceAll(saved);
    expect(entryOf(1)?.subscribed).toBe(true);
    expect(lib().settings.alerts).toBe(false);
    expect(lib().inboxReadAt).toBe(5);
    expect(typeof lib().toggleSubscribe).toBe('function');
  });

  it('refreshSnapshot updates saved details without touching the rest', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    const before = entryOf(1)!;
    lib().refreshSnapshot(snapshot(1, { status: 'FINISHED', episodes: 13 }));
    expect(entryOf(1)).toMatchObject({ subscribedAt: T0, updatedAt: T0 });
    expect(entryOf(1)?.snapshot).toMatchObject({ status: 'FINISHED', episodes: 13 });
    expect(entryOf(1)).not.toBe(before);
  });

  it('refreshSnapshot keeps the same object when nothing changed, and never creates entries', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    const entries = lib().entries;
    lib().refreshSnapshot(snapshot(1));
    lib().refreshSnapshot(snapshot(2));
    expect(lib().entries).toBe(entries);
  });
});

describe('helpers', () => {
  it('subscribedIds lists subscribed titles in order', () => {
    lib().toggleSubscribe(snapshot(30), T0);
    lib().toggleSubscribe(snapshot(4), T0);
    lib().setList(snapshot(9), 'plan', T0);
    expect(subscribedIds(lib().entries)).toEqual([4, 30]);
  });

  it('nextUnwatched finds the first gap and stops at the total', () => {
    expect(nextUnwatched({ watched: [], snapshot: snapshot(1) })).toBe(1);
    expect(nextUnwatched({ watched: [1, 2, 4], snapshot: snapshot(1) })).toBe(3);
    expect(nextUnwatched({ watched: [1, 2, 3], snapshot: snapshot(1, { episodes: 3 }) })).toBeNull();
    expect(nextUnwatched({ watched: [1, 2, 3], snapshot: snapshot(1, { episodes: null }) })).toBe(4);
  });
});

describe('persistence', () => {
  it('writes library data, and only data, under the versioned key', () => {
    lib().toggleSubscribe(snapshot(1), T0);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(stored.version).toBe(1);
    expect(Object.keys(stored.state).sort()).toEqual(['entries', 'history', 'inboxReadAt', 'settings']);
    expect(stored.state.entries['1'].subscribed).toBe(true);
  });

  it('rehydrates saved data and drops damaged records instead of failing', async () => {
    lib().toggleSubscribe(snapshot(1), T0);
    lib().toggleSubscribe(snapshot(2), T0);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.entries['2'].watched = 'broken';
    stored.state.entries['__proto__x'] = { id: 'x' };
    stored.state.settings.titleLang = 'english';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    await useLibrary.persist.rehydrate();
    expect(Object.keys(lib().entries)).toEqual(['1']);
    expect(lib().settings.titleLang).toBe('english');
    expect(typeof lib().setList).toBe('function');
  });

  it('starts clean when storage holds garbage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    await useLibrary.persist.rehydrate();
    expect(lib().entries).toEqual({});
    lib().toggleSubscribe(snapshot(3), T0);
    expect(entryOf(3)?.subscribed).toBe(true);
  });
});
