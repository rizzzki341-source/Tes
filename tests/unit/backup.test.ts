import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup, sanitizeLibrary } from '../../src/lib/backup';
import type { PersistedLibrary } from '../../src/store/library';
import { entry } from './helpers';

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);

function library(): PersistedLibrary {
  return {
    entries: {
      '21': entry(21, { subscribedAt: 1000, list: 'watching', watched: [1, 2, 3], addedAt: 900, updatedAt: 1100 }),
      '195516': entry(195516, { subscribed: false, subscribedAt: null, list: 'plan' }),
    },
    history: [
      { key: '21:3', mediaId: 21, episode: 3, at: 1100 },
      { key: '21:2', mediaId: 21, episode: 2, at: 1050 },
    ],
    settings: { titleLang: 'english', alerts: false, dataSaver: true },
    inboxReadAt: 1234,
  };
}

/** A backup whose `data` was changed by `mutate`. */
function tampered(mutate: (data: any) => void): string {
  const parsed = JSON.parse(exportBackup(library(), NOW));
  mutate(parsed.data);
  return JSON.stringify(parsed);
}

describe('exportBackup', () => {
  it('wraps the library in a versioned envelope', () => {
    const parsed = JSON.parse(exportBackup(library(), NOW));
    expect(parsed).toMatchObject({ app: 'myanime', version: 1, exportedAt: '2026-11-17T12:00:00.000Z' });
    expect(Object.keys(parsed.data).sort()).toEqual(['entries', 'history', 'inboxReadAt', 'settings']);
  });

  it('leaves out anything that is not library data', () => {
    const withActions = { ...library(), toggleSubscribe: () => true, extra: 'x' } as unknown as PersistedLibrary;
    const parsed = JSON.parse(exportBackup(withActions, NOW));
    expect(parsed.data.extra).toBeUndefined();
    expect(parsed.data.toggleSubscribe).toBeUndefined();
  });
});

describe('parseBackup', () => {
  it('round-trips an export', () => {
    const result = parseBackup(exportBackup(library(), NOW));
    expect(result).toEqual({ ok: true, data: library() });
  });

  it('round-trips an empty library', () => {
    const empty: PersistedLibrary = { entries: {}, history: [], settings: { titleLang: 'romaji', alerts: true, dataSaver: false }, inboxReadAt: 0 };
    expect(parseBackup(exportBackup(empty, NOW))).toEqual({ ok: true, data: empty });
  });

  it('accepts pretty-printed text with surrounding whitespace', () => {
    const pretty = `\n  ${JSON.stringify(JSON.parse(exportBackup(library(), NOW)), null, 2)}\n`;
    expect(parseBackup(pretty).ok).toBe(true);
  });

  it.each([
    ['empty text', ''],
    ['whitespace', '   \n'],
    ['not JSON', 'halo, ini bukan cadangan'],
    ['truncated JSON', exportBackup(library(), NOW).slice(0, 80)],
    ['a JSON string', '"myanime"'],
    ['a JSON number', '42'],
    ['null', 'null'],
    ['an array', '[]'],
    ['another app', JSON.stringify({ app: 'lainnya', version: 1, data: library() })],
    ['a future version', JSON.stringify({ app: 'myanime', version: 2, data: library() })],
    ['a missing data block', JSON.stringify({ app: 'myanime', version: 1 })],
    ['data that is not an object', JSON.stringify({ app: 'myanime', version: 1, data: 'x' })],
  ])('rejects %s with a reason', (_name, text) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(5);
  });

  it.each([
    ['entries as an array', (d: any) => (d.entries = [])],
    ['history as an object', (d: any) => (d.history = {})],
    ['missing settings', (d: any) => delete d.settings],
    ['an unknown title language', (d: any) => (d.settings.titleLang = 'klingon')],
    ['a non-boolean setting', (d: any) => (d.settings.alerts = 'yes')],
    ['a negative read marker', (d: any) => (d.inboxReadAt = -1)],
    ['a key that does not match the id', (d: any) => (d.entries['22'] = d.entries['21'])],
    ['a non-numeric key', (d: any) => (d.entries.abc = d.entries['21'])],
    ['a string id', (d: any) => (d.entries['21'].id = '21')],
    ['a fractional id', (d: any) => (d.entries['21'].id = 21.5)],
    ['a snapshot for another title', (d: any) => (d.entries['21'].snapshot.id = 22)],
    ['a title that is not text', (d: any) => (d.entries['21'].snapshot.title.romaji = { toString: 'x' })],
    ['an http cover', (d: any) => (d.entries['21'].snapshot.cover = 'http://img.example/a.jpg')],
    ['a javascript: cover', (d: any) => (d.entries['21'].snapshot.cover = 'javascript:alert(1)')],
    ['an unknown format', (d: any) => (d.entries['21'].snapshot.format = 'HOLOGRAM')],
    ['an unknown list status', (d: any) => (d.entries['21'].list = 'dropped')],
    ['watched as text', (d: any) => (d.entries['21'].watched = '1,2,3')],
    ['a watched episode of zero', (d: any) => (d.entries['21'].watched = [0])],
    ['a watched episode that is not a whole number', (d: any) => (d.entries['21'].watched = [1.5])],
    ['an absurd episode number', (d: any) => (d.entries['21'].watched = [1e9])],
    ['a non-numeric timestamp', (d: any) => (d.entries['21'].addedAt = 'kemarin')],
    ['a history key that does not match', (d: any) => (d.history[0].key = '21:99')],
    ['a history item without a time', (d: any) => delete d.history[0].at],
    ['a history item that is null', (d: any) => (d.history[0] = null)],
  ])('rejects %s', (_name, mutate) => {
    expect(parseBackup(tampered(mutate))).toMatchObject({ ok: false });
  });

  it('is not fooled by prototype keys', () => {
    const text = `{"app":"myanime","version":1,"data":{"entries":{"__proto__":{"polluted":true}},"history":[],"settings":{"titleLang":"romaji","alerts":true,"dataSaver":false},"inboxReadAt":0}}`;
    expect(parseBackup(text)).toMatchObject({ ok: false });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const viaProto = `{"__proto__":{"app":"myanime","version":1},"data":{}}`;
    expect(parseBackup(viaProto)).toMatchObject({ ok: false });
  });

  it('drops unknown fields instead of carrying them along', () => {
    const result = parseBackup(
      tampered((d) => {
        d.entries['21'].onload = 'alert(1)';
        d.entries['21'].snapshot.html = '<img src=x onerror=alert(1)>';
        d.settings.admin = true;
        d.surprise = { deep: [1, 2, 3] };
      }),
    );
    expect(result).toEqual({ ok: true, data: library() });
  });

  it('normalises watched episodes and skips entries that hold nothing', () => {
    const result = parseBackup(
      tampered((d) => {
        d.entries['21'].watched = [3, 1, 3, 2, 1];
        d.entries['195516'].list = null;
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entries['21']?.watched).toEqual([1, 2, 3]);
      expect(result.data.entries['195516']).toBeUndefined();
    }
  });

  it('caps history at 500 items, newest first', () => {
    const result = parseBackup(
      tampered((d) => {
        d.history = Array.from({ length: 700 }, (_, i) => ({ key: `21:${i + 1}`, mediaId: 21, episode: i + 1, at: i + 1 }));
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.history).toHaveLength(500);
      expect(result.data.history[0]?.episode).toBe(700);
    }
  });

  it('rejects oversized input without parsing it', () => {
    expect(parseBackup(' '.repeat(2_000_001) + '{}')).toMatchObject({ ok: false });
  });

  it('never throws, whatever it is given', () => {
    const hostile: unknown[] = [undefined, null, 42, {}, [], () => 1, Symbol('x'), '{"a":', '\u0000', '{"app":"myanime","version":1,"data":null}'];
    for (const input of hostile) {
      expect(() => parseBackup(input as string)).not.toThrow();
      expect(parseBackup(input as string).ok).toBe(false);
    }
  });
});

describe('sanitizeLibrary (lenient, used for device storage)', () => {
  it('keeps the good records and drops the damaged ones', () => {
    const data = library() as any;
    data.entries['21'].watched = 'broken';
    data.history.push({ key: 'x', mediaId: 'y' });
    data.settings = { titleLang: 'english' };
    delete data.inboxReadAt;
    const result = sanitizeLibrary(data, 'lenient');
    expect(result?.entries['21']).toBeUndefined();
    expect(result?.entries['195516']).toBeDefined();
    expect(result?.history).toHaveLength(2);
    expect(result?.settings).toEqual({ titleLang: 'english', alerts: true, dataSaver: false });
    expect(result?.inboxReadAt).toBe(0);
  });

  it('still returns null for something that is not a library at all', () => {
    expect(sanitizeLibrary('nope', 'lenient')).toBeNull();
    expect(sanitizeLibrary(null, 'lenient')).toBeNull();
  });
});
