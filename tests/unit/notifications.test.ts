import { describe, expect, it } from 'vitest';
import {
  alertId,
  buildInbox,
  diffAlerts,
  ensureAlertPermission,
  planAlerts,
  syncNativeAlerts,
  type PlannedAlert,
} from '../../src/lib/notifications';
import { anime, entry, snapshot, tracking } from './helpers';

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const sec = (ms: number) => Math.floor(ms / 1000);

describe('alertId', () => {
  it('is stable for the same media and episode', () => {
    expect(alertId(21, 1100)).toBe(alertId(21, 1100));
    expect(alertId(195516, 8)).toBe(alertId(195516, 8));
  });

  it('differs between episodes and between titles', () => {
    expect(alertId(21, 1)).not.toBe(alertId(21, 2));
    expect(alertId(21, 1)).not.toBe(alertId(22, 1));
    expect(alertId(1, 4096 - 1)).not.toBe(alertId(2, 0));
  });

  it('stays a positive 31-bit integer, even for odd input', () => {
    const samples: [number, number][] = [
      [1, 1],
      [21, 1100],
      [195_516, 24],
      [524_287, 4095],
      [9_999_999, 99_999],
      [0, 0],
      [-5, -3],
      [2 ** 40, 2 ** 20],
    ];
    for (const [media, episode] of samples) {
      const id = alertId(media, episode);
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(0x7fffffff);
    }
  });

  it('has no collisions across a realistic range', () => {
    const seen = new Set<number>();
    for (let media = 1; media <= 400; media += 1) {
      for (let episode = 1; episode <= 60; episode += 1) seen.add(alertId(media * 487, episode));
    }
    expect(seen.size).toBe(400 * 60);
  });
});

describe('planAlerts', () => {
  const data = tracking(
    [anime(1, { episodes: 12 }), anime(2, { episodes: null }), anime(3)],
    [
      { mediaId: 1, episode: 10, airingAt: sec(NOW - DAY) },
      { mediaId: 1, episode: 11, airingAt: sec(NOW + 6 * DAY) },
      { mediaId: 1, episode: 12, airingAt: sec(NOW + 13 * DAY) },
      { mediaId: 2, episode: 5, airingAt: sec(NOW + 2 * HOUR) },
      { mediaId: 3, episode: 2, airingAt: sec(NOW + HOUR) },
    ],
  );
  const entries = [entry(1), entry(2), entry(3, { subscribed: false, subscribedAt: null, list: 'plan' })];

  it('plans only future airings of subscribed titles, soonest first', () => {
    const planned = planAlerts(entries, data, NOW, 'romaji');
    expect(planned.map((a) => [a.mediaId, a.episode])).toEqual([
      [2, 5],
      [1, 11],
      [1, 12],
    ]);
    expect(planned.map((a) => a.atMs)).toEqual([sec(NOW + 2 * HOUR) * 1000, sec(NOW + 6 * DAY) * 1000, sec(NOW + 13 * DAY) * 1000]);
  });

  it('fills in id, title, body and the finale flag', () => {
    const [first, , last] = planAlerts(entries, data, NOW, 'romaji');
    expect(first).toMatchObject({ id: alertId(2, 5), title: 'Anime 2', finale: false });
    expect(first?.body).toContain('Episode 5');
    expect(last).toMatchObject({ id: alertId(1, 12), finale: true });
    expect(last?.body).toContain('terakhir');
  });

  it('uses the chosen title language with a fallback', () => {
    expect(planAlerts(entries, data, NOW, 'english')[0]?.title).toBe('Show 2');
    expect(planAlerts(entries, data, NOW, 'native')[0]?.title).toBe('Anime 2');
  });

  it('respects the maximum', () => {
    expect(planAlerts(entries, data, NOW, 'romaji', 2)).toHaveLength(2);
    expect(planAlerts(entries, data, NOW, 'romaji', 0)).toEqual([]);
  });

  it('defaults to at most 60 alerts', () => {
    const many = tracking(
      [anime(1, { episodes: null })],
      Array.from({ length: 80 }, (_, i) => ({ mediaId: 1, episode: i + 1, airingAt: sec(NOW + (i + 1) * DAY) })),
    );
    expect(planAlerts([entry(1)], many, NOW, 'romaji')).toHaveLength(60);
  });

  it('also plans the next episode that only the title itself reports', () => {
    const data2 = tracking([anime(4, { nextAiring: { episode: 7, airingAt: sec(NOW + HOUR) } })], []);
    expect(planAlerts([entry(4)], data2, NOW, 'romaji').map((a) => a.episode)).toEqual([7]);
  });

  it('falls back to the saved snapshot when the title is missing from fresh data', () => {
    const data2 = tracking([], [{ mediaId: 9, episode: 3, airingAt: sec(NOW + HOUR) }]);
    const saved = entry(9, { snapshot: snapshot(9, { episodes: 3 }) });
    expect(planAlerts([saved], data2, NOW, 'romaji')).toMatchObject([{ title: 'Anime 9', finale: true }]);
  });

  it('plans nothing without subscriptions', () => {
    expect(planAlerts([], data, NOW, 'romaji')).toEqual([]);
  });
});

describe('diffAlerts', () => {
  const alert = (id: number): PlannedAlert => ({ id, mediaId: id, episode: 1, atMs: NOW + HOUR, title: 't', body: 'b', finale: false });

  it('schedules what is missing and cancels what is no longer wanted', () => {
    const { cancel, schedule } = diffAlerts([alert(1), alert(2), alert(3)], [2, 3, 4, 5]);
    expect(cancel.sort()).toEqual([4, 5]);
    expect(schedule.map((a) => a.id)).toEqual([1]);
  });

  it('is a no-op when both sides already match', () => {
    expect(diffAlerts([alert(1), alert(2)], [2, 1])).toEqual({ cancel: [], schedule: [] });
  });

  it('cancels everything when nothing is desired', () => {
    expect(diffAlerts([], [7, 8, 8])).toEqual({ cancel: [7, 8], schedule: [] });
  });
});

describe('buildInbox', () => {
  const subscribedAt = NOW - 10 * DAY;
  const data = tracking(
    [anime(1, { episodes: 12 })],
    [
      { mediaId: 1, episode: 7, airingAt: sec(NOW - 40 * DAY) },
      { mediaId: 1, episode: 9, airingAt: sec(NOW - 14 * DAY) },
      { mediaId: 1, episode: 10, airingAt: sec(NOW - 7 * DAY) },
      { mediaId: 1, episode: 11, airingAt: sec(NOW - HOUR) },
      { mediaId: 1, episode: 12, airingAt: sec(NOW + 6 * DAY) },
    ],
  );

  it('lists episodes aired after subscribing, newest first', () => {
    const inbox = buildInbox([entry(1, { subscribedAt })], data, NOW);
    expect(inbox.map((i) => i.episode)).toEqual([11, 10]);
    expect(inbox[0]).toMatchObject({ key: '1:11', mediaId: 1, atMs: sec(NOW - HOUR) * 1000, finale: false });
    expect(inbox[0]?.title.romaji).toBe('Anime 1');
    expect(inbox[0]?.cover).toBe('https://img.example/1-large.jpg');
  });

  it('cuts off at the moment of subscribing (exclusive)', () => {
    const exactly = sec(NOW - 7 * DAY) * 1000;
    expect(buildInbox([entry(1, { subscribedAt: exactly })], data, NOW).map((i) => i.episode)).toEqual([11]);
    expect(buildInbox([entry(1, { subscribedAt: exactly - 1 })], data, NOW).map((i) => i.episode)).toEqual([11, 10]);
  });

  it('keeps only the last 30 days', () => {
    const inbox = buildInbox([entry(1, { subscribedAt: 0 })], data, NOW);
    expect(inbox.map((i) => i.episode)).toEqual([11, 10, 9]);
  });

  it('flags the finale once it has aired', () => {
    const later = NOW + 7 * DAY;
    const inbox = buildInbox([entry(1, { subscribedAt })], data, later);
    expect(inbox[0]).toMatchObject({ episode: 12, finale: true });
    expect(inbox.slice(1).every((i) => !i.finale)).toBe(true);
  });

  it('ignores titles that are not subscribed or have no subscribe time', () => {
    expect(buildInbox([entry(1, { subscribed: false, subscribedAt: null, list: 'watching' })], data, NOW)).toEqual([]);
    expect(buildInbox([entry(1, { subscribedAt: null })], data, NOW)).toEqual([]);
    expect(buildInbox([], data, NOW)).toEqual([]);
  });

  it('never includes episodes that have not aired yet', () => {
    const inbox = buildInbox([entry(1, { subscribedAt: 0 })], data, NOW);
    expect(inbox.every((i) => i.atMs <= NOW)).toBe(true);
  });
});

describe('native bridge on the web', () => {
  it('reports unsupported instead of throwing', async () => {
    await expect(syncNativeAlerts([])).resolves.toBe('unsupported');
    await expect(ensureAlertPermission()).resolves.toBe('unsupported');
  });
});
