import { describe, expect, it } from 'vitest';
import { defaultEpisode, isTrailer, parseWatchTarget } from '../../src/screens/watch.helpers';

const q = (query: string) => new URLSearchParams(query);

describe('parseWatchTarget', () => {
  it('reads a video or a playlist id', () => {
    expect(parseWatchTarget(q('v=dQw4w9WgXcQ'))).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseWatchTarget(q('list=PL-abc_123XYZ'))).toEqual({ playlistId: 'PL-abc_123XYZ' });
    expect(parseWatchTarget(q('v=dQw4w9WgXcQ&t=trailer'))).toEqual({ videoId: 'dQw4w9WgXcQ' });
  });

  it('lets a playlist win over a video', () => {
    expect(parseWatchTarget(q('v=dQw4w9WgXcQ&list=PL-abc_123XYZ'))).toEqual({ playlistId: 'PL-abc_123XYZ' });
  });

  it('rejects missing and malformed ids', () => {
    for (const query of [
      '',
      't=trailer',
      'v=',
      'v=bad!id',
      'v=abc',
      'v=../../etc',
      'v=dQw4w9WgXcQ%3Fautoplay%3D1',
      'v=dQw4w9WgXcQ%26origin%3Dx',
      'v=https%3A%2F%2Fevil.example',
      'list=PL%20abc%20123',
      'v=' + 'a'.repeat(65),
    ]) {
      expect(parseWatchTarget(q(query))).toBeNull();
    }
  });

  it('rejects the whole link when either id is malformed', () => {
    expect(parseWatchTarget(q('v=dQw4w9WgXcQ&list=bad!id'))).toBeNull();
    expect(parseWatchTarget(q('v=bad!id&list=PL-abc_123XYZ'))).toBeNull();
  });
});

describe('isTrailer', () => {
  it('is true only for t=trailer', () => {
    expect(isTrailer(q('v=dQw4w9WgXcQ&t=trailer'))).toBe(true);
    expect(isTrailer(q('v=dQw4w9WgXcQ'))).toBe(false);
    expect(isTrailer(q('v=dQw4w9WgXcQ&t=90'))).toBe(false);
  });
});

describe('defaultEpisode', () => {
  it('starts on the first unwatched episode', () => {
    expect(defaultEpisode(12, [])).toBe(1);
    expect(defaultEpisode(12, [1, 2, 3])).toBe(4);
    expect(defaultEpisode(12, [1, 2, 5])).toBe(3);
  });

  it('stays on the last episode when everything is watched', () => {
    expect(defaultEpisode(3, [1, 2, 3])).toBe(3);
    expect(defaultEpisode(3, [1, 2, 3, 9])).toBe(3);
  });

  it('gives 0 when no episode count is known', () => {
    expect(defaultEpisode(0, [])).toBe(0);
  });
});
