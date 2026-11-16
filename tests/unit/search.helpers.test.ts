import { describe, expect, it } from 'vitest';
import {
  EMPTY_SEARCH,
  MAX_QUERY_LENGTH,
  MIN_YEAR,
  cleanQuery,
  describeSearch,
  effectiveSort,
  isSearchActive,
  parseSearchUrl,
  seasonChipLabel,
  sortOptions,
  toSearchParams,
  toUrlParams,
  withQuery,
  withSort,
  yearOptions,
  type SearchUrlState,
} from '../../src/screens/search.helpers';

const NOW_YEAR = 2026;
const parse = (query: string) => parseSearchUrl(new URLSearchParams(query), NOW_YEAR);
const state = (extra: Partial<SearchUrlState> = {}): SearchUrlState => ({ ...EMPTY_SEARCH, ...extra });

describe('parseSearchUrl', () => {
  it('reads nothing from an empty query string', () => {
    expect(parse('')).toEqual(EMPTY_SEARCH);
  });

  it('reads the links other screens use', () => {
    expect(parse('genre=Action')).toEqual(state({ genre: 'Action' }));
    expect(parse('season=FALL&year=2026&sort=POPULARITY_DESC')).toEqual(
      state({ season: 'FALL', year: 2026, sort: 'POPULARITY_DESC' }),
    );
    expect(parse('format=MOVIE&sort=TRENDING_DESC')).toEqual(state({ format: 'MOVIE', sort: 'TRENDING_DESC' }));
    expect(parse('status=NOT_YET_RELEASED')).toEqual(state({ status: 'NOT_YET_RELEASED' }));
    expect(parse('sort=SCORE_DESC')).toEqual(state({ sort: 'SCORE_DESC' }));
  });

  it('reads every parameter together', () => {
    expect(parse('q=frieren&genre=Fantasy&format=TV&status=FINISHED&year=2023&season=FALL&sort=SCORE_DESC')).toEqual({
      q: 'frieren',
      genre: 'Fantasy',
      format: 'TV',
      status: 'FINISHED',
      year: 2023,
      season: 'FALL',
      sort: 'SCORE_DESC',
    });
  });

  it('drops unknown and malformed values', () => {
    expect(parse('genre=Hentai&format=BOOK&status=AIRING&season=MONSOON&sort=ID_DESC&page=3')).toEqual(EMPTY_SEARCH);
    expect(parse('format=movie&status=finished&season=fall')).toEqual(EMPTY_SEARCH);
  });

  it('accepts a genre regardless of letter case and returns the catalogue spelling', () => {
    expect(parse('genre=slice%20of%20life').genre).toBe('Slice of Life');
    expect(parse('genre=SCI-FI').genre).toBe('Sci-Fi');
  });

  it('keeps the year only inside the supported range', () => {
    expect(parse(`year=${MIN_YEAR}`).year).toBe(MIN_YEAR);
    expect(parse(`year=${NOW_YEAR + 1}`).year).toBe(NOW_YEAR + 1);
    for (const bad of [`${MIN_YEAR - 1}`, `${NOW_YEAR + 2}`, '26', '20260', '2026.5', '-2026', 'abcd', '', '2e3', ' 2026']) {
      expect(parse(`year=${encodeURIComponent(bad)}`).year).toBeNull();
    }
  });

  it('trims the query, collapses spaces and caps its length', () => {
    expect(parse('q=%20%20one%20%20%20piece%20').q).toBe('one piece');
    expect(parse(`q=${'a'.repeat(MAX_QUERY_LENGTH + 50)}`).q).toHaveLength(MAX_QUERY_LENGTH);
    expect(parse('q=%20%20').q).toBe('');
  });

  it('ignores "paling cocok" when there is nothing to match', () => {
    expect(parse('sort=SEARCH_MATCH').sort).toBeNull();
    expect(parse('q=naruto&sort=SEARCH_MATCH').sort).toBe('SEARCH_MATCH');
  });
});

describe('sorting', () => {
  it('defaults to most popular without a query and best match with one', () => {
    expect(effectiveSort(state())).toBe('POPULARITY_DESC');
    expect(effectiveSort(state({ q: 'naruto' }))).toBe('SEARCH_MATCH');
  });

  it('respects an explicit sort', () => {
    expect(effectiveSort(state({ sort: 'SCORE_DESC' }))).toBe('SCORE_DESC');
    expect(effectiveSort(state({ q: 'naruto', sort: 'POPULARITY_DESC' }))).toBe('POPULARITY_DESC');
  });

  it('never asks for best match without a query', () => {
    expect(effectiveSort(state({ sort: 'SEARCH_MATCH' }))).toBe('POPULARITY_DESC');
    expect(toSearchParams(state({ sort: 'SEARCH_MATCH' })).sort).toBe('POPULARITY_DESC');
  });

  it('offers "paling cocok" only while there is a query', () => {
    expect(sortOptions('')).toEqual(['POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'START_DATE_DESC']);
    expect(sortOptions('naruto')).toEqual(['SEARCH_MATCH', 'POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'START_DATE_DESC']);
  });

  it('stores a chosen sort only when it differs from the default', () => {
    expect(withSort(state(), 'POPULARITY_DESC').sort).toBeNull();
    expect(withSort(state(), 'SCORE_DESC').sort).toBe('SCORE_DESC');
    expect(withSort(state({ q: 'naruto' }), 'SEARCH_MATCH').sort).toBeNull();
    expect(withSort(state({ q: 'naruto' }), 'POPULARITY_DESC').sort).toBe('POPULARITY_DESC');
  });
});

describe('toSearchParams', () => {
  it('passes the filters through and resolves the sort', () => {
    expect(toSearchParams(state({ q: 'bleach', genre: 'Action', format: 'TV', status: 'RELEASING', year: 2024, season: 'FALL' }))).toEqual({
      q: 'bleach',
      genre: 'Action',
      format: 'TV',
      status: 'RELEASING',
      year: 2024,
      season: 'FALL',
      sort: 'SEARCH_MATCH',
    });
  });
});

describe('toUrlParams', () => {
  it('writes nothing for the default list', () => {
    expect(toUrlParams(EMPTY_SEARCH).toString()).toBe('');
  });

  it('leaves the default sort out and keeps a chosen one', () => {
    expect(toUrlParams(state({ q: 'naruto' })).toString()).toBe('q=naruto');
    expect(toUrlParams(state({ q: 'naruto', sort: 'SEARCH_MATCH' })).toString()).toBe('q=naruto');
    expect(toUrlParams(state({ sort: 'POPULARITY_DESC' })).toString()).toBe('');
    expect(toUrlParams(state({ sort: 'SEARCH_MATCH' })).toString()).toBe('');
    expect(toUrlParams(state({ sort: 'SCORE_DESC' })).toString()).toBe('sort=SCORE_DESC');
  });

  it('round-trips through the address bar', () => {
    const full = state({ q: 'one piece', genre: 'Sci-Fi', format: 'MOVIE', status: 'FINISHED', year: 1999, season: 'SUMMER', sort: 'START_DATE_DESC' });
    expect(parse(toUrlParams(full).toString())).toEqual(full);
    expect(toUrlParams(full).toString()).toBe(
      'q=one+piece&genre=Sci-Fi&format=MOVIE&status=FINISHED&year=1999&season=SUMMER&sort=START_DATE_DESC',
    );
  });
});

describe('isSearchActive', () => {
  it('is false for the default list', () => {
    expect(isSearchActive(EMPTY_SEARCH)).toBe(false);
    expect(isSearchActive(state({ sort: 'POPULARITY_DESC' }))).toBe(false);
    expect(isSearchActive(state({ sort: 'SEARCH_MATCH' }))).toBe(false);
  });

  it('is true for a query, any filter or a different order', () => {
    const cases: Partial<SearchUrlState>[] = [
      { q: 'a' },
      { genre: 'Drama' },
      { format: 'OVA' },
      { status: 'HIATUS' },
      { year: 2020 },
      { season: 'WINTER' },
      { sort: 'TRENDING_DESC' },
      { q: 'a', sort: 'POPULARITY_DESC' },
    ];
    for (const extra of cases) expect(isSearchActive(state(extra))).toBe(true);
  });
});

describe('withQuery', () => {
  it('starts a new search from best match', () => {
    expect(withQuery(state({ sort: 'SCORE_DESC', genre: 'Action' }), ' frieren ')).toEqual(state({ q: 'frieren', genre: 'Action' }));
  });

  it('keeps a sort chosen while searching', () => {
    expect(withQuery(state({ q: 'fri', sort: 'SCORE_DESC' }), 'frieren').sort).toBe('SCORE_DESC');
  });

  it('clears the query without touching the filters', () => {
    expect(withQuery(state({ q: 'frieren', format: 'TV' }), '')).toEqual(state({ format: 'TV' }));
  });
});

describe('cleanQuery', () => {
  it('handles a missing value', () => {
    expect(cleanQuery(null)).toBe('');
    expect(cleanQuery('\tkimi  no\nna wa ')).toBe('kimi no na wa');
  });
});

describe('yearOptions', () => {
  it('runs from next year down to the first supported year', () => {
    const years = yearOptions(NOW_YEAR);
    expect(years[0]).toBe(NOW_YEAR + 1);
    expect(years[years.length - 1]).toBe(MIN_YEAR);
    expect(years).toHaveLength(NOW_YEAR + 1 - MIN_YEAR + 1);
    expect(new Set(years).size).toBe(years.length);
  });
});

describe('labels', () => {
  it('names the season chip', () => {
    expect(seasonChipLabel(state({ season: 'FALL', year: 2026 }))).toBe('Musim gugur 2026');
    expect(seasonChipLabel(state({ season: 'SPRING' }))).toBe('Musim semi');
    expect(seasonChipLabel(state({ year: 2026 }))).toBeNull();
  });

  it('describes the default list and the browse orders', () => {
    expect(describeSearch(EMPTY_SEARCH)).toBe('Populer saat ini');
    expect(describeSearch(state({ sort: 'SCORE_DESC' }))).toBe('Skor tertinggi');
    expect(describeSearch(state({ sort: 'TRENDING_DESC' }))).toBe('Lagi ramai dibicarakan');
    expect(describeSearch(state({ sort: 'START_DATE_DESC' }))).toBe('Paling baru');
  });

  it('describes the query and the filters', () => {
    expect(describeSearch(state({ q: 'naruto' }))).toBe('Hasil untuk “naruto”');
    expect(describeSearch(state({ genre: 'Action', format: 'MOVIE' }))).toBe('Aksi · Film');
    expect(describeSearch(state({ season: 'FALL', year: 2026, sort: 'POPULARITY_DESC' }))).toBe('Musim gugur 2026');
    expect(describeSearch(state({ status: 'NOT_YET_RELEASED', year: 2027 }))).toBe('Belum tayang · 2027');
    expect(describeSearch(state({ q: 'naruto', genre: 'Action', status: 'FINISHED' }))).toBe('Hasil untuk “naruto” · Aksi · Tamat');
  });
});
