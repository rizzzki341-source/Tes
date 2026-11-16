import { describe, expect, it } from 'vitest';
import {
  TRANSLATE_LIMIT,
  airingDateTime,
  factRows,
  metaParts,
  nextEpisodeText,
  otherTitle,
  parseAnimeId,
  progressText,
  relationText,
  releaseYear,
  statusTone,
  synopsisParagraphs,
  translateUrl,
} from '../../src/screens/detail.helpers';

describe('parseAnimeId', () => {
  it('accepts positive integers that fit a GraphQL Int', () => {
    expect(parseAnimeId('21')).toBe(21);
    expect(parseAnimeId('999999999')).toBe(999_999_999);
    expect(parseAnimeId('2147483647')).toBe(2_147_483_647);
  });

  it('rejects everything else', () => {
    for (const raw of [undefined, '', 'abc', '0', '-3', '1.5', '021', '1e3', ' 21', '21abc', '2147483648', '99999999999']) {
      expect(parseAnimeId(raw)).toBeNull();
    }
  });
});

describe('otherTitle', () => {
  const title = { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey’s End', native: '葬送のフリーレン' };

  it('prefers English, then romaji, then the native title', () => {
    expect(otherTitle(title, 'Sousou no Frieren')).toBe('Frieren: Beyond Journey’s End');
    expect(otherTitle(title, 'Frieren: Beyond Journey’s End')).toBe('Sousou no Frieren');
    expect(otherTitle({ romaji: 'A', english: null, native: 'エー' }, 'A')).toBe('エー');
  });

  it('skips titles equal to the one shown and returns null when nothing is left', () => {
    expect(otherTitle({ romaji: 'One Piece', english: 'ONE PIECE', native: null }, 'One Piece')).toBeNull();
    expect(otherTitle({ romaji: null, english: null, native: null }, 'Tanpa judul')).toBeNull();
  });
});

describe('metaParts and releaseYear', () => {
  it('lists format, year, episodes and duration', () => {
    expect(metaParts({ format: 'TV', seasonYear: 2026, startDate: null, episodes: 12, duration: 24 })).toEqual([
      'Seri TV',
      '2026',
      '12 episode',
      '24 menit',
    ]);
  });

  it('leaves out what is unknown and the episode count of a film', () => {
    expect(metaParts({ format: null, seasonYear: null, startDate: null, episodes: null, duration: null })).toEqual([]);
    expect(metaParts({ format: 'MOVIE', seasonYear: null, startDate: '2024-07', episodes: 1, duration: 110 })).toEqual([
      'Film',
      '2024',
      '110 menit',
    ]);
  });

  it('falls back to the start date for the year', () => {
    expect(releaseYear({ seasonYear: null, startDate: '1999-10-20' })).toBe(1999);
    expect(releaseYear({ seasonYear: null, startDate: null })).toBeNull();
  });
});

describe('labels', () => {
  it('translates relations', () => {
    expect(relationText('SEQUEL')).toBe('Sekuel');
    expect(relationText('PREQUEL')).toBe('Prekuel');
    expect(relationText('SIDE_STORY')).toBe('Cerita sampingan');
    expect(relationText('PARENT')).toBe('Cerita induk');
    expect(relationText('ALTERNATIVE')).toBe('Versi alternatif');
    expect(relationText('SPIN_OFF')).toBe('Spin-off');
    expect(relationText('SUMMARY')).toBe('Ringkasan');
    expect(relationText('CHARACTER')).toBe('Lainnya');
    expect(relationText('constructor')).toBe('Lainnya');
    expect(relationText(null)).toBe('Lainnya');
  });

  it('picks a chip tone per status', () => {
    expect(statusTone('RELEASING')).toBe('accent');
    expect(statusTone('NOT_YET_RELEASED')).toBe('warning');
    expect(statusTone('FINISHED')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
  });

  it('never reports more watched episodes than there are', () => {
    expect(progressText(3, 12)).toBe('3 dari 12 episode ditonton');
    expect(progressText(14, 12)).toBe('12 dari 12 episode ditonton');
  });
});

describe('synopsisParagraphs', () => {
  it('splits on blank lines and keeps single line breaks', () => {
    expect(synopsisParagraphs('Satu.\nMasih satu.\n\nDua.\r\n\r\n \n\nTiga.  ')).toEqual(['Satu.\nMasih satu.', 'Dua.', 'Tiga.']);
  });

  it('returns nothing for an empty synopsis', () => {
    expect(synopsisParagraphs('')).toEqual([]);
    expect(synopsisParagraphs('  \n\n ')).toEqual([]);
    expect(synopsisParagraphs(null)).toEqual([]);
  });
});

describe('translateUrl', () => {
  it('builds an English -> Indonesian Google Translate link with the text encoded', () => {
    const url = new URL(translateUrl('A boy & his "dog"?\nNew line #1'));
    expect(url.origin + url.pathname).toBe('https://translate.google.com/');
    expect(url.searchParams.get('sl')).toBe('en');
    expect(url.searchParams.get('tl')).toBe('id');
    expect(url.searchParams.get('op')).toBe('translate');
    expect(url.searchParams.get('text')).toBe('A boy & his "dog"?\nNew line #1');
    expect(url.hash).toBe('');
  });

  it('sends at most the first 1500 characters', () => {
    const text = new URL(translateUrl('x'.repeat(4000))).searchParams.get('text');
    expect(text).toHaveLength(TRANSLATE_LIMIT);
  });

  it('does not throw when the cut lands inside a surrogate pair', () => {
    const text = 'x'.repeat(TRANSLATE_LIMIT - 1) + '😀 tail';
    expect(new URL(translateUrl(text)).searchParams.get('text')).toBe('x'.repeat(TRANSLATE_LIMIT - 1));
    expect(translateUrl('\uD800 lone')).toBe('https://translate.google.com/?sl=en&tl=id&op=translate');
  });
});

describe('next episode', () => {
  const now = new Date(2026, 10, 16, 12, 0, 0).getTime();

  it('says how long until the episode airs', () => {
    expect(nextEpisodeText(8, now + 2 * 3_600_000, now)).toBe('Episode 8 tayang 2 j lagi');
    expect(nextEpisodeText(8, now + 50 * 3_600_000 + 60_000, now)).toBe('Episode 8 tayang 2 hr 2 j lagi');
  });

  it('handles the last minute and the past', () => {
    expect(nextEpisodeText(8, now + 30_000, now)).toBe('Episode 8 tayang sebentar lagi');
    expect(nextEpisodeText(8, now, now)).toBe('Episode 8 sudah tayang');
    expect(nextEpisodeText(8, now - 5_000, now)).toBe('Episode 8 sudah tayang');
  });

  it('prints the full local date and time', () => {
    expect(airingDateTime(new Date(2026, 10, 17, 21, 30).getTime())).toBe('Selasa, 17 November 2026, pukul 21.30');
  });
});

describe('factRows', () => {
  it('lists the known facts in order', () => {
    expect(
      factRows({
        studios: ['Madhouse', 'MAPPA'],
        source: 'MANGA',
        season: 'FALL',
        seasonYear: 2026,
        startDate: '2026-10-03',
        endDate: '2026-12',
        title: { romaji: 'A', english: null, native: 'エー' },
      }),
    ).toEqual([
      { label: 'Studio', value: 'Madhouse, MAPPA' },
      { label: 'Sumber', value: 'Manga' },
      { label: 'Musim', value: 'Musim gugur 2026' },
      { label: 'Mulai', value: '3 Oktober 2026' },
      { label: 'Selesai', value: 'Desember 2026' },
      { label: 'Judul asli', value: 'エー' },
    ]);
  });

  it('leaves out rows without a value', () => {
    expect(
      factRows({
        studios: [],
        source: null,
        season: null,
        seasonYear: 2026,
        startDate: null,
        endDate: null,
        title: { romaji: 'A', english: null, native: null },
      }),
    ).toEqual([]);
  });
});
