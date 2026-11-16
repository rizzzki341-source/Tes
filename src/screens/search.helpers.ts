import {
  ANIME_FORMATS,
  ANIME_STATUSES,
  SEASONS,
  SORT_KEYS,
  type AnimeFormat,
  type AnimeStatus,
  type SearchParams,
  type Season,
  type SortKey,
} from '../lib/anilist/types';
import { FORMAT_LABEL, GENRES, SEASON_LABEL, STATUS_LABEL, genreLabel } from '../lib/catalog';

export const MIN_YEAR = 1970;
export const MAX_QUERY_LENGTH = 100;

/** What the address bar holds. `sort: null` means "whatever fits": best match with a query, most popular without. */
export interface SearchUrlState {
  q: string;
  genre: string | null;
  format: AnimeFormat | null;
  status: AnimeStatus | null;
  year: number | null;
  season: Season | null;
  sort: SortKey | null;
}

export const EMPTY_SEARCH: SearchUrlState = { q: '', genre: null, format: null, status: null, year: null, season: null, sort: null };

const SORT_HEADING: Record<SortKey, string> = {
  POPULARITY_DESC: 'Populer saat ini',
  TRENDING_DESC: 'Lagi ramai dibicarakan',
  SCORE_DESC: 'Skor tertinggi',
  START_DATE_DESC: 'Paling baru',
  SEARCH_MATCH: 'Populer saat ini',
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function cleanQuery(value: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH).trim();
}

function parseGenre(value: string | null): string | null {
  if (value === null) return null;
  const wanted = value.trim().toLowerCase();
  return GENRES.find((g) => g.id.toLowerCase() === wanted)?.id ?? null;
}

function parseYear(value: string | null, nowYear: number): number | null {
  if (value === null || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= MIN_YEAR && year <= nowYear + 1 ? year : null;
}

export function defaultSort(q: string): SortKey {
  return q === '' ? 'POPULARITY_DESC' : 'SEARCH_MATCH';
}

/** Reads the query string; anything unknown or malformed is dropped. */
export function parseSearchUrl(params: URLSearchParams, nowYear: number): SearchUrlState {
  const q = cleanQuery(params.get('q'));
  const sort = oneOf(params.get('sort'), SORT_KEYS);
  return {
    q,
    genre: parseGenre(params.get('genre')),
    format: oneOf(params.get('format'), ANIME_FORMATS),
    status: oneOf(params.get('status'), ANIME_STATUSES),
    year: parseYear(params.get('year'), nowYear),
    season: oneOf(params.get('season'), SEASONS),
    // "Paling cocok" has nothing to match against without a query.
    sort: sort === 'SEARCH_MATCH' && q === '' ? null : sort,
  };
}

export function effectiveSort(state: Pick<SearchUrlState, 'q' | 'sort'>): SortKey {
  if (state.sort === null || (state.sort === 'SEARCH_MATCH' && state.q === '')) return defaultSort(state.q);
  return state.sort;
}

export function toSearchParams(state: SearchUrlState): SearchParams {
  return {
    q: state.q,
    genre: state.genre,
    format: state.format,
    status: state.status,
    year: state.year,
    season: state.season,
    sort: effectiveSort(state),
  };
}

/** Canonical query string: empty values and the default sort are left out. */
export function toUrlParams(state: SearchUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q !== '') params.set('q', state.q);
  if (state.genre) params.set('genre', state.genre);
  if (state.format) params.set('format', state.format);
  if (state.status) params.set('status', state.status);
  if (state.year !== null) params.set('year', String(state.year));
  if (state.season) params.set('season', state.season);
  const sort = effectiveSort(state);
  if (sort !== defaultSort(state.q)) params.set('sort', sort);
  return params;
}

/** True when the query, a filter or a non-default sort narrows or reorders the list. */
export function isSearchActive(state: SearchUrlState): boolean {
  return (
    state.q !== '' ||
    state.genre !== null ||
    state.format !== null ||
    state.status !== null ||
    state.year !== null ||
    state.season !== null ||
    effectiveSort(state) !== defaultSort(state.q)
  );
}

/** A query typed into an empty box starts from "paling cocok"; a sort picked for browsing would bury the match. */
export function withQuery(state: SearchUrlState, q: string): SearchUrlState {
  const next = cleanQuery(q);
  if (state.q === '' && next !== '') return { ...state, q: next, sort: null };
  return { ...state, q: next };
}

export function withSort(state: SearchUrlState, sort: SortKey): SearchUrlState {
  return { ...state, sort: sort === defaultSort(state.q) ? null : sort };
}

/** Next year (announced titles) down to MIN_YEAR. */
export function yearOptions(nowYear: number): number[] {
  const years: number[] = [];
  for (let year = nowYear + 1; year >= MIN_YEAR; year -= 1) years.push(year);
  return years;
}

export function sortOptions(q: string): SortKey[] {
  const browse: SortKey[] = ['POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'START_DATE_DESC'];
  return q === '' ? browse : ['SEARCH_MATCH', ...browse];
}

/** "Musim gugur 2026", or just the season when no year is set. Null without a season. */
export function seasonChipLabel(state: Pick<SearchUrlState, 'season' | 'year'>): string | null {
  if (!state.season) return null;
  return state.year !== null ? `${SEASON_LABEL[state.season]} ${state.year}` : SEASON_LABEL[state.season];
}

/** Heading above the results: what is being shown. */
export function describeSearch(state: SearchUrlState): string {
  const parts: string[] = [];
  if (state.genre) parts.push(genreLabel(state.genre));
  if (state.format) parts.push(FORMAT_LABEL[state.format]);
  if (state.status) parts.push(STATUS_LABEL[state.status]);
  const season = seasonChipLabel(state);
  if (season) parts.push(season);
  else if (state.year !== null) parts.push(String(state.year));

  if (state.q !== '') return [`Hasil untuk “${state.q}”`, ...parts].join(' · ');
  if (parts.length > 0) return parts.join(' · ');
  return SORT_HEADING[effectiveSort(state)];
}
