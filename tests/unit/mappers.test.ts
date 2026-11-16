import { describe, expect, it } from 'vitest';
import {
  cleanDescription,
  mapAiringItem,
  mapAiringItems,
  mapAnime,
  mapAnimeList,
  mapDetail,
  mapFuzzyDate,
  mapTracking,
  type RawMediaDetail,
} from '../../src/lib/anilist/mappers';
import { rawMedia } from './helpers';

describe('cleanDescription', () => {
  it('turns <br> into newlines and strips every other tag', () => {
    expect(cleanDescription('Baris satu<br>Baris dua<br/>Baris tiga<BR />Baris empat')).toBe('Baris satu\nBaris dua\nBaris tiga\nBaris empat');
    expect(cleanDescription('<i>Miring</i> dan <b>tebal</b> dan <a href="https://x.example">tautan</a>.')).toBe('Miring dan tebal dan tautan.');
  });

  it('decodes common entities', () => {
    expect(cleanDescription('Tom &amp; Jerry &lt;3 &quot;hai&quot; &#39;ya&#39; &apos;ok&apos;')).toBe(`Tom & Jerry <3 "hai" 'ya' 'ok'`);
    expect(cleanDescription('satu&nbsp;dua &mdash; tiga &hellip; &#x41;&#66;')).toBe('satu dua — tiga … AB');
    expect(cleanDescription('biarkan &tidakdikenal; apa adanya')).toBe('biarkan &tidakdikenal; apa adanya');
  });

  it('collapses blank lines and trims each line', () => {
    expect(cleanDescription('  Paragraf satu.  <br><br><br><br>\n\n  Paragraf dua.   \n')).toBe('Paragraf satu.\n\nParagraf dua.');
    expect(cleanDescription('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('leaves nothing executable behind', () => {
    const cleaned = cleanDescription('Halo<script>alert(1)</script><img src=x onerror="alert(2)"><iframe src="https://evil.example"></iframe> dunia');
    expect(cleaned).toBe('Haloalert(1) dunia');
    expect(cleaned).not.toMatch(/<\w/);
  });

  it('treats decoded angle brackets as plain text', () => {
    // The result is rendered as a text node, so an entity-encoded tag is just characters.
    expect(cleanDescription('&lt;b&gt;bukan tag&lt;/b&gt;')).toBe('<b>bukan tag</b>');
  });

  it('returns an empty string for missing input', () => {
    expect(cleanDescription(null)).toBe('');
    expect(cleanDescription(undefined)).toBe('');
    expect(cleanDescription('')).toBe('');
    expect(cleanDescription(42 as unknown as string)).toBe('');
  });
});

describe('mapAnime', () => {
  it('maps a full record', () => {
    expect(mapAnime(rawMedia(21, { bannerImage: 'https://img.example/banner.jpg' }))).toEqual({
      id: 21,
      title: { romaji: 'Anime 21', english: null, native: null },
      cover: 'https://img.example/21-large.jpg',
      coverSmall: 'https://img.example/21-small.jpg',
      banner: 'https://img.example/banner.jpg',
      format: 'TV',
      status: 'RELEASING',
      episodes: 12,
      score: 81,
      popularity: 500,
      genres: ['Action', 'Drama'],
      season: 'FALL',
      seasonYear: 2026,
      nextAiring: { episode: 8, airingAt: 1_800_000_000 },
    });
  });

  it('drops adult entries', () => {
    expect(mapAnime(rawMedia(1, { isAdult: true }))).toBeNull();
  });

  it('drops anything that is not anime', () => {
    expect(mapAnime(rawMedia(1, { type: 'MANGA' }))).toBeNull();
    expect(mapAnime(rawMedia(1, { type: 'NOVEL' }))).toBeNull();
  });

  it('keeps entries whose type or adult flag was not requested', () => {
    expect(mapAnime({ id: 5 })?.id).toBe(5);
    expect(mapAnime(rawMedia(5, { type: undefined, isAdult: null }))?.id).toBe(5);
  });

  it('survives null and missing fields', () => {
    expect(mapAnime(null)).toBeNull();
    expect(mapAnime(undefined)).toBeNull();
    expect(mapAnime({})).toBeNull();
    expect(mapAnime({ id: null })).toBeNull();
    expect(mapAnime({ id: 0 })).toBeNull();
    expect(mapAnime({ id: 9, title: null, coverImage: null, genres: null, nextAiringEpisode: null })).toEqual({
      id: 9,
      title: { romaji: null, english: null, native: null },
      cover: null,
      coverSmall: null,
      banner: null,
      format: null,
      status: null,
      episodes: null,
      score: null,
      popularity: null,
      genres: [],
      season: null,
      seasonYear: null,
      nextAiring: null,
    });
  });

  it('nulls unknown enum values and unsafe image URLs', () => {
    const mapped = mapAnime(
      rawMedia(3, {
        format: 'HOLOGRAM',
        status: 'UNKNOWN',
        season: 'MONSOON',
        coverImage: { large: 'http://img.example/plain.jpg', medium: 'javascript:alert(1)' },
        bannerImage: 'data:image/png;base64,AAAA',
        genres: ['Action', null, ''],
        title: { romaji: '   ', english: 'Judul', native: null },
      }),
    );
    expect(mapped).toMatchObject({
      format: null,
      status: null,
      season: null,
      cover: null,
      coverSmall: null,
      banner: null,
      genres: ['Action'],
      title: { romaji: null, english: 'Judul', native: null },
    });
  });

  it('falls back between cover sizes', () => {
    expect(mapAnime(rawMedia(3, { coverImage: { large: null, medium: 'https://img.example/m.jpg' } }))).toMatchObject({
      cover: 'https://img.example/m.jpg',
      coverSmall: 'https://img.example/m.jpg',
    });
  });

  it('ignores a malformed next airing', () => {
    expect(mapAnime(rawMedia(3, { nextAiringEpisode: { episode: null, airingAt: 5 } }))?.nextAiring).toBeNull();
    expect(mapAnime(rawMedia(3, { nextAiringEpisode: { episode: 0, airingAt: 5 } }))?.nextAiring).toBeNull();
  });
});

describe('lists and airings', () => {
  it('mapAnimeList filters, de-duplicates and keeps order', () => {
    const list = mapAnimeList([rawMedia(3), null, rawMedia(1, { isAdult: true }), rawMedia(2, { type: 'MANGA' }), rawMedia(3), rawMedia(4), undefined]);
    expect(list.map((a) => a.id)).toEqual([3, 4]);
    expect(mapAnimeList(null)).toEqual([]);
    expect(mapAnimeList(undefined)).toEqual([]);
  });

  it('mapAiringItem needs an id, a slot and a usable anime', () => {
    expect(mapAiringItem({ id: 7, episode: 3, airingAt: 100, media: rawMedia(1) })).toMatchObject({ id: 7, episode: 3, airingAt: 100, anime: { id: 1 } });
    expect(mapAiringItem({ id: 7, episode: 3, airingAt: 100, media: null })).toBeNull();
    expect(mapAiringItem({ id: 7, episode: 3, airingAt: 100, media: rawMedia(1, { isAdult: true }) })).toBeNull();
    expect(mapAiringItem({ id: 7, episode: 3, airingAt: 100, media: rawMedia(1, { type: 'MANGA' }) })).toBeNull();
    expect(mapAiringItem({ id: null, episode: 3, airingAt: 100, media: rawMedia(1) })).toBeNull();
    expect(mapAiringItem({ id: 7, episode: 3, airingAt: null, media: rawMedia(1) })).toBeNull();
    expect(mapAiringItem(null)).toBeNull();
  });

  it('mapAiringItems drops bad rows and duplicate ids', () => {
    const items = mapAiringItems([
      { id: 1, episode: 1, airingAt: 10, media: rawMedia(1) },
      { id: 2, episode: 1, airingAt: 11, media: null },
      { id: 1, episode: 1, airingAt: 10, media: rawMedia(1) },
      null,
      { id: 3, episode: 2, airingAt: 12, media: rawMedia(2) },
    ]);
    expect(items.map((i) => i.id)).toEqual([1, 3]);
    expect(mapAiringItems(null)).toEqual([]);
  });

  it('mapTracking keeps slots of known titles, de-duplicated and in time order', () => {
    const data = mapTracking(
      [rawMedia(1), rawMedia(2, { isAdult: true }), null],
      [
        { id: 10, mediaId: 1, episode: 5, airingAt: 300 },
        { id: 11, mediaId: 1, episode: 4, airingAt: 200 },
        { id: 12, mediaId: 1, episode: 5, airingAt: 300 },
        { id: 13, mediaId: 2, episode: 1, airingAt: 100 },
        { id: 14, mediaId: null, episode: 1, airingAt: 100 },
        null,
      ],
    );
    expect(data.anime.map((a) => a.id)).toEqual([1]);
    expect(data.airing).toEqual([
      { mediaId: 1, episode: 4, airingAt: 200 },
      { mediaId: 1, episode: 5, airingAt: 300 },
    ]);
    expect(mapTracking(null, null)).toEqual({ anime: [], airing: [] });
  });
});

describe('mapFuzzyDate', () => {
  it('keeps whatever precision is known', () => {
    expect(mapFuzzyDate({ year: 2026, month: 11, day: 7 })).toBe('2026-11-07');
    expect(mapFuzzyDate({ year: 2026, month: 4, day: null })).toBe('2026-04');
    expect(mapFuzzyDate({ year: 2026, month: null, day: null })).toBe('2026');
    expect(mapFuzzyDate({ year: null, month: 4, day: 1 })).toBeNull();
    expect(mapFuzzyDate({ year: 2026, month: 13, day: 1 })).toBe('2026');
    expect(mapFuzzyDate(null)).toBeNull();
  });
});

describe('mapDetail', () => {
  const raw: RawMediaDetail = {
    ...rawMedia(21),
    description: 'Seorang anak <i>ingin</i> jadi raja.<br><br>(Sumber: resmi)',
    duration: 24,
    source: 'MANGA',
    siteUrl: 'https://anilist.co/anime/21',
    startDate: { year: 1999, month: 10, day: 20 },
    endDate: { year: null, month: null, day: null },
    studios: { nodes: [{ name: 'Studio Satu' }, null, { name: null }] },
    trailer: { id: 'dQw4w9WgXcQ', site: 'youtube' },
    externalLinks: [
      { url: 'https://www.netflix.com/title/1', site: 'Netflix', type: 'STREAMING', language: null },
      { url: 'https://twitter.com/x', site: 'Twitter', type: 'SOCIAL', language: null },
      { url: 'http://old.example/stream', site: 'Old', type: 'STREAMING', language: null },
      { url: 'https://www.bilibili.tv/id/play/1', site: 'Bilibili TV', type: 'STREAMING', language: 'Indonesian' },
      null,
    ],
    streamingEpisodes: [
      { title: 'Episode 1 - Awal', url: 'https://www.crunchyroll.com/watch/1', site: 'Crunchyroll' },
      { title: 'Episode 2', url: 'javascript:alert(1)', site: 'Crunchyroll' },
      null,
    ],
    airingSchedule: {
      nodes: [
        { episode: 9, airingAt: 2000 },
        { episode: 8, airingAt: 1000 },
        null,
      ],
    },
    relations: {
      edges: [
        { relationType: 'SEQUEL', node: rawMedia(22) },
        { relationType: 'ADAPTATION', node: rawMedia(23, { type: 'MANGA' }) },
        { relationType: 'SIDE_STORY', node: rawMedia(24, { isAdult: true }) },
        { relationType: null, node: rawMedia(25) },
        null,
      ],
    },
    recommendations: {
      nodes: [
        { mediaRecommendation: rawMedia(30) },
        { mediaRecommendation: null },
        { mediaRecommendation: rawMedia(31, { isAdult: true }) },
        { mediaRecommendation: rawMedia(30) },
        { mediaRecommendation: rawMedia(21) },
        null,
      ],
    },
  };

  it('maps every detail field', () => {
    const detail = mapDetail(raw)!;
    expect(detail.id).toBe(21);
    expect(detail.description).toBe('Seorang anak ingin jadi raja.\n\n(Sumber: resmi)');
    expect(detail.duration).toBe(24);
    expect(detail.source).toBe('MANGA');
    expect(detail.studios).toEqual(['Studio Satu']);
    expect(detail.startDate).toBe('1999-10-20');
    expect(detail.endDate).toBeNull();
    expect(detail.trailerYoutubeId).toBe('dQw4w9WgXcQ');
    expect(detail.siteUrl).toBe('https://anilist.co/anime/21');
  });

  it('keeps only https streaming links', () => {
    expect(mapDetail(raw)!.links).toEqual([
      { site: 'Netflix', url: 'https://www.netflix.com/title/1', language: null },
      { site: 'Bilibili TV', url: 'https://www.bilibili.tv/id/play/1', language: 'Indonesian' },
    ]);
    expect(mapDetail(raw)!.officialEpisodes).toEqual([
      { title: 'Episode 1 - Awal', url: 'https://www.crunchyroll.com/watch/1', site: 'Crunchyroll' },
    ]);
  });

  it('upgrades http official episode links to https and still drops other schemes', () => {
    const detail = mapDetail({
      ...raw,
      streamingEpisodes: [
        { title: 'Episode 1', url: 'http://www.crunchyroll.com/watch/G8WUNGWKG/one', site: 'Crunchyroll' },
        { title: 'Episode 2', url: 'HTTP://www.crunchyroll.com/watch/2', site: 'Crunchyroll' },
        { title: 'Episode 3', url: 'ftp://www.crunchyroll.com/watch/3', site: 'Crunchyroll' },
        { title: 'Episode 4', url: 'javascript:alert(1)//http://x', site: 'Crunchyroll' },
      ],
    })!;
    expect(detail.officialEpisodes.map((e) => e.url)).toEqual([
      'https://www.crunchyroll.com/watch/G8WUNGWKG/one',
      'https://www.crunchyroll.com/watch/2',
    ]);
  });

  it('sorts upcoming episodes and filters relations and recommendations', () => {
    const detail = mapDetail(raw)!;
    expect(detail.upcoming).toEqual([
      { episode: 8, airingAt: 1000 },
      { episode: 9, airingAt: 2000 },
    ]);
    expect(detail.relations.map((r) => [r.relation, r.anime.id])).toEqual([
      ['SEQUEL', 22],
      ['OTHER', 25],
    ]);
    expect(detail.recommendations.map((a) => a.id)).toEqual([30]);
  });

  it('accepts only YouTube trailers with a plausible id', () => {
    expect(mapDetail({ ...raw, trailer: { id: 'x123', site: 'dailymotion' } })!.trailerYoutubeId).toBeNull();
    expect(mapDetail({ ...raw, trailer: { id: 'bad id"><script>', site: 'youtube' } })!.trailerYoutubeId).toBeNull();
    expect(mapDetail({ ...raw, trailer: null })!.trailerYoutubeId).toBeNull();
  });

  it('copes with a record that has nothing but an id', () => {
    expect(mapDetail({ id: 77 })).toMatchObject({
      id: 77,
      description: '',
      duration: null,
      source: null,
      studios: [],
      startDate: null,
      endDate: null,
      trailerYoutubeId: null,
      links: [],
      officialEpisodes: [],
      upcoming: [],
      relations: [],
      recommendations: [],
      siteUrl: 'https://anilist.co/anime/77',
    });
  });

  it('treats missing, adult and non-anime records as not found', () => {
    expect(mapDetail(null)).toBeNull();
    expect(mapDetail({ ...raw, isAdult: true })).toBeNull();
    expect(mapDetail({ ...raw, type: 'MANGA' })).toBeNull();
  });
});
