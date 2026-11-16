import { addDays, nextSeasonOf, seasonOf } from '../time';
import { ApiError, gql } from './client';
import {
  mapAiringItems,
  mapAnimeList,
  mapDetail,
  mapTracking,
  type RawAiring,
  type RawMedia,
  type RawMediaDetail,
} from './mappers';
import type { AiringItem, Anime, AnimeDetail, HomeData, PageResult, SearchParams, SortKey, TrackingData } from './types';

// Document shapes follow the ones checked against the live API (see tests/live).
const CARD = `fragment C on Media { id type isAdult title { romaji english native } coverImage { large medium } format status episodes averageScore popularity genres season seasonYear nextAiringEpisode { episode airingAt } }`;

export const HOME_QUERY = `query Home($season: MediaSeason, $year: Int, $nextSeason: MediaSeason, $nextYear: Int, $now: Int, $since: Int) {
  trending: Page(perPage: 8) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ...C bannerImage } }
  latest: Page(perPage: 24) { airingSchedules(airingAt_greater: $since, airingAt_lesser: $now, sort: TIME_DESC) { id episode airingAt media { ...C } } }
  season: Page(perPage: 18) { media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) { ...C } }
  upcoming: Page(perPage: 18) { media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, sort: POPULARITY_DESC, isAdult: false) { ...C } }
  movies: Page(perPage: 18) { media(type: ANIME, format: MOVIE, sort: TRENDING_DESC, isAdult: false) { ...C } }
  top: Page(perPage: 18) { media(type: ANIME, sort: SCORE_DESC, isAdult: false, format_in: [TV, MOVIE]) { ...C } }
} ${CARD}`;

export const DAY_QUERY = `query Day($from: Int, $to: Int, $page: Int) { Page(page: $page, perPage: 50) { pageInfo { hasNextPage } airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) { id episode airingAt media { ...C } } } } ${CARD}`;

export const SEARCH_QUERY = `query Search($page: Int, $search: String, $genre: String, $format: MediaFormat, $status: MediaStatus, $year: Int, $season: MediaSeason, $sort: [MediaSort]) { Page(page: $page, perPage: 24) { pageInfo { hasNextPage currentPage } media(type: ANIME, isAdult: false, search: $search, genre: $genre, format: $format, status: $status, seasonYear: $year, season: $season, sort: $sort) { ...C } } } ${CARD}`;

export const DETAIL_QUERY = `query Detail($id: Int) { Media(id: $id, type: ANIME) { ...C bannerImage description(asHtml: false) duration source siteUrl startDate { year month day } endDate { year month day } studios(isMain: true) { nodes { name } } trailer { id site } externalLinks { url site type language } streamingEpisodes { title url site } airingSchedule(notYetAired: true, perPage: 25) { nodes { episode airingAt } } relations { edges { relationType node { ...C } } } recommendations(perPage: 12, sort: RATING_DESC) { nodes { mediaRecommendation { ...C } } } } } ${CARD}`;

// Aired and upcoming slots are asked for separately so a long backlog can never push the
// future episodes (the ones alerts are planned from) off the page.
export const TRACK_QUERY = `query Track($ids: [Int], $since: Int) {
  media: Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ...C } }
  aired: Page(perPage: 50) { airingSchedules(mediaId_in: $ids, airingAt_greater: $since, notYetAired: false, sort: TIME_DESC) { id episode airingAt mediaId } }
  next: Page(perPage: 50) { airingSchedules(mediaId_in: $ids, notYetAired: true, sort: TIME) { id episode airingAt mediaId } }
} ${CARD}`;

export const SCHEDULE_MAX_PAGES = 4;
export const TRACKING_MAX_IDS = 50;
const LATEST_WINDOW_S = 3 * 86_400;

const toSeconds = (ms: number) => Math.floor(ms / 1000);

interface RawHome {
  trending?: { media?: RawMedia[] | null } | null;
  latest?: { airingSchedules?: RawAiring[] | null } | null;
  season?: { media?: RawMedia[] | null } | null;
  upcoming?: { media?: RawMedia[] | null } | null;
  movies?: { media?: RawMedia[] | null } | null;
  top?: { media?: RawMedia[] | null } | null;
}

export async function fetchHome(nowMs: number, signal?: AbortSignal): Promise<HomeData> {
  const now = toSeconds(nowMs);
  const date = new Date(nowMs);
  const current = seasonOf(date);
  const next = nextSeasonOf(date);
  const data = await gql<RawHome>(
    HOME_QUERY,
    {
      season: current.season,
      year: current.year,
      nextSeason: next.season,
      nextYear: next.year,
      now,
      since: now - LATEST_WINDOW_S,
    },
    signal,
  );
  return {
    trending: mapAnimeList(data.trending?.media),
    latest: mapAiringItems(data.latest?.airingSchedules),
    season: mapAnimeList(data.season?.media),
    upcoming: mapAnimeList(data.upcoming?.media),
    movies: mapAnimeList(data.movies?.media),
    top: mapAnimeList(data.top?.media),
  };
}

interface RawDay {
  Page?: { pageInfo?: { hasNextPage?: boolean | null } | null; airingSchedules?: RawAiring[] | null } | null;
}

/** Airings in `[dayStartMs, next local day)`. Follows pages, at most SCHEDULE_MAX_PAGES requests. */
export async function fetchScheduleDay(dayStartMs: number, signal?: AbortSignal): Promise<AiringItem[]> {
  // The API bounds are exclusive, so the lower one is moved back a second to keep midnight airings.
  const from = toSeconds(dayStartMs) - 1;
  const to = toSeconds(addDays(dayStartMs, 1));
  const raw: RawAiring[] = [];
  for (let page = 1; page <= SCHEDULE_MAX_PAGES; page += 1) {
    const data = await gql<RawDay>(DAY_QUERY, { from, to, page }, signal);
    raw.push(...(data.Page?.airingSchedules ?? []));
    if (data.Page?.pageInfo?.hasNextPage !== true) break;
  }
  return mapAiringItems(raw).sort((a, b) => a.airingAt - b.airingAt || a.id - b.id);
}

/** SEARCH_MATCH only makes sense with a search term; without one it falls back to popularity. */
export function resolveSort(params: Pick<SearchParams, 'q' | 'sort'>): SortKey {
  const sort = params.sort ?? 'POPULARITY_DESC';
  if (sort === 'SEARCH_MATCH') return params.q.trim() === '' ? 'POPULARITY_DESC' : 'SEARCH_MATCH';
  return sort;
}

export function searchVariables(params: SearchParams, page: number): Record<string, unknown> {
  const variables: Record<string, unknown> = { page: Math.max(1, Math.trunc(page) || 1), sort: [resolveSort(params)] };
  const q = params.q.trim();
  if (q !== '') variables.search = q;
  if (params.genre) variables.genre = params.genre;
  if (params.format) variables.format = params.format;
  if (params.status) variables.status = params.status;
  if (params.year) variables.year = params.year;
  if (params.season) variables.season = params.season;
  return variables;
}

interface RawSearch {
  Page?: {
    pageInfo?: { hasNextPage?: boolean | null; currentPage?: number | null } | null;
    media?: RawMedia[] | null;
  } | null;
}

export async function searchAnime(params: SearchParams, page: number, signal?: AbortSignal): Promise<PageResult<Anime>> {
  const variables = searchVariables(params, page);
  const data = await gql<RawSearch>(SEARCH_QUERY, variables, signal);
  return {
    items: mapAnimeList(data.Page?.media),
    page: data.Page?.pageInfo?.currentPage ?? (variables.page as number),
    hasNext: data.Page?.pageInfo?.hasNextPage === true,
  };
}

export async function fetchAnime(id: number, signal?: AbortSignal): Promise<AnimeDetail> {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError('not-found', 'Invalid anime id', 404);
  const data = await gql<{ Media?: RawMediaDetail | null }>(DETAIL_QUERY, { id }, signal);
  const detail = mapDetail(data.Media);
  if (!detail) throw new ApiError('not-found', 'Anime not found', 404);
  return detail;
}

interface RawTrack {
  media?: { media?: RawMedia[] | null } | null;
  aired?: { airingSchedules?: RawAiring[] | null } | null;
  next?: { airingSchedules?: RawAiring[] | null } | null;
}

/**
 * One request for every subscribed title. Beyond TRACKING_MAX_IDS the highest ids win:
 * they are the newest entries, the ones most likely to still be airing.
 */
export async function fetchTracking(ids: number[], sinceMs: number, signal?: AbortSignal): Promise<TrackingData> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => b - a);
  if (unique.length === 0) return { anime: [], airing: [] };
  const data = await gql<RawTrack>(
    TRACK_QUERY,
    { ids: unique.slice(0, TRACKING_MAX_IDS), since: toSeconds(sinceMs) },
    signal,
  );
  return mapTracking(data.media?.media, [...(data.aired?.airingSchedules ?? []), ...(data.next?.airingSchedules ?? [])]);
}
