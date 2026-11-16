import { describe, expect, it } from 'vitest';
import type { WatchLink } from '../../src/lib/anilist/types';
import {
  SITE_PRIORITY,
  YT_ID,
  parseYoutubeUrl,
  safeHttpsUrl,
  toWatchSources,
  watchPath,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from '../../src/lib/sources';

const link = (site: string, url: string): WatchLink => ({ site, url, language: null });

describe('parseYoutubeUrl', () => {
  it('reads playlist URLs', () => {
    expect(parseYoutubeUrl('https://www.youtube.com/playlist?list=PLabc123_-XYZ')).toEqual({ playlistId: 'PLabc123_-XYZ' });
    expect(parseYoutubeUrl('https://youtube.com/playlist?list=PLabc123_-XYZ&si=share')).toEqual({ playlistId: 'PLabc123_-XYZ' });
    expect(parseYoutubeUrl('https://www.youtube.com/embed/videoseries?list=PLabc123_-XYZ')).toEqual({ playlistId: 'PLabc123_-XYZ' });
  });

  it('reads watch URLs, with and without a playlist', () => {
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123_-XYZ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      playlistId: 'PLabc123_-XYZ',
    });
  });

  it('reads youtu.be, embed, shorts and live URLs', () => {
    expect(parseYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://youtu.be/dQw4w9WgXcQ?list=PLabc123_-XYZ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      playlistId: 'PLabc123_-XYZ',
    });
    expect(parseYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
    expect(parseYoutubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
  });

  it('returns null for channel pages and other YouTube pages', () => {
    expect(parseYoutubeUrl('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/@MuseIndonesia')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/c/SomeChannel/videos')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/user/somebody')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/results?search_query=anime')).toBeNull();
  });

  it('rejects non-https, look-alike hosts, bad ids and junk', () => {
    expect(parseYoutubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYoutubeUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYoutubeUrl('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=<script>')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch')).toBeNull();
    expect(parseYoutubeUrl('javascript:alert(1)')).toBeNull();
    expect(parseYoutubeUrl('not a url')).toBeNull();
    expect(parseYoutubeUrl('')).toBeNull();
  });
});

describe('YT_ID', () => {
  it('accepts ids and refuses anything that could break out of a URL', () => {
    expect(YT_ID.test('dQw4w9WgXcQ')).toBe(true);
    expect(YT_ID.test('PLabc123_-XYZ')).toBe(true);
    expect(YT_ID.test('abc')).toBe(false);
    expect(YT_ID.test('abc def ghi')).toBe(false);
    expect(YT_ID.test('abcdef"onload=')).toBe(false);
    expect(YT_ID.test('abcdef/../x')).toBe(false);
    expect(YT_ID.test('a'.repeat(65))).toBe(false);
  });
});

describe('youtube URL builders', () => {
  it('builds privacy-enhanced embed URLs', () => {
    expect(youtubeEmbedUrl({ videoId: 'dQw4w9WgXcQ' })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbedUrl({ playlistId: 'PLabc123_-XYZ' })).toBe(
      'https://www.youtube-nocookie.com/embed/videoseries?list=PLabc123_-XYZ',
    );
  });

  it('builds links to YouTube itself and to the in-app player', () => {
    expect(youtubeWatchUrl({ videoId: 'dQw4w9WgXcQ' })).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeWatchUrl({ playlistId: 'PLabc123_-XYZ' })).toBe('https://www.youtube.com/playlist?list=PLabc123_-XYZ');
    expect(watchPath(21, { videoId: 'dQw4w9WgXcQ' })).toBe('/anime/21/tonton?v=dQw4w9WgXcQ');
    expect(watchPath(21, { playlistId: 'PLabc123_-XYZ' })).toBe('/anime/21/tonton?list=PLabc123_-XYZ');
  });
});

describe('safeHttpsUrl', () => {
  it('lets only https through', () => {
    expect(safeHttpsUrl('https://anilist.co/anime/21')).toBe('https://anilist.co/anime/21');
    expect(safeHttpsUrl('http://anilist.co/anime/21')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('data:text/html,<p>x</p>')).toBeNull();
    expect(safeHttpsUrl('//anilist.co')).toBeNull();
    expect(safeHttpsUrl(null)).toBeNull();
    expect(safeHttpsUrl(42)).toBeNull();
  });
});

describe('toWatchSources', () => {
  it('classifies YouTube playlists, videos and everything else', () => {
    const sources = toWatchSources([
      link('YouTube', 'https://www.youtube.com/playlist?list=PLabc123_-XYZ'),
      link('YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      link('YouTube', 'https://www.youtube.com/@MuseIndonesia'),
      link('Netflix', 'https://www.netflix.com/title/1'),
    ]);
    expect(sources).toEqual([
      { kind: 'youtube-playlist', site: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLabc123_-XYZ', playlistId: 'PLabc123_-XYZ' },
      { kind: 'youtube-video', site: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' },
      { kind: 'external', site: 'YouTube', url: 'https://www.youtube.com/@MuseIndonesia' },
      { kind: 'external', site: 'Netflix', url: 'https://www.netflix.com/title/1' },
    ]);
  });

  it('prefers the playlist when a watch URL carries both ids', () => {
    const [source] = toWatchSources([link('YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123_-XYZ')]);
    expect(source).toMatchObject({ kind: 'youtube-playlist', playlistId: 'PLabc123_-XYZ' });
  });

  it('orders: playable in the app, then by site priority, then alphabetically', () => {
    const sources = toWatchSources([
      link('Zebra Stream', 'https://zebra.example/a'),
      link('Crunchyroll', 'https://www.crunchyroll.com/a'),
      link('Alpha Stream', 'https://alpha.example/a'),
      link('Netflix', 'https://www.netflix.com/title/1'),
      link('YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      link('Bilibili TV', 'https://www.bilibili.tv/id/play/1'),
      link('YouTube', 'https://www.youtube.com/playlist?list=PLabc123_-XYZ'),
    ]);
    expect(sources.map((s) => `${s.kind}:${s.site}`)).toEqual([
      'youtube-playlist:YouTube',
      'youtube-video:YouTube',
      'external:Bilibili TV',
      'external:Netflix',
      'external:Crunchyroll',
      'external:Alpha Stream',
      'external:Zebra Stream',
    ]);
    expect(SITE_PRIORITY.indexOf('Bilibili TV')).toBeLessThan(SITE_PRIORITY.indexOf('Netflix'));
  });

  it('drops links that are not https', () => {
    const sources = toWatchSources([
      link('Old Site', 'http://old.example/watch'),
      link('Script', 'javascript:alert(1)'),
      link('Broken', 'nope'),
      link('Empty', ''),
      link('Netflix', 'https://www.netflix.com/title/1'),
    ]);
    expect(sources).toEqual([{ kind: 'external', site: 'Netflix', url: 'https://www.netflix.com/title/1' }]);
  });

  it('removes duplicate URLs and keeps the first one', () => {
    const sources = toWatchSources([
      link('Netflix', 'https://www.netflix.com/title/1'),
      link('Netflix (dup)', 'https://www.netflix.com/title/1'),
      link('Netflix', 'https://www.netflix.com/title/2'),
    ]);
    expect(sources.map((s) => s.url)).toEqual(['https://www.netflix.com/title/1', 'https://www.netflix.com/title/2']);
    expect(sources[0]?.site).toBe('Netflix');
  });

  it('falls back to the host name when the site name is blank', () => {
    expect(toWatchSources([link('  ', 'https://stream.example/x')])).toEqual([
      { kind: 'external', site: 'stream.example', url: 'https://stream.example/x' },
    ]);
  });

  it('returns an empty list for no links', () => {
    expect(toWatchSources([])).toEqual([]);
  });
});
