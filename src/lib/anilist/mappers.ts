import {
  ANIME_FORMATS,
  ANIME_STATUSES,
  SEASONS,
  type Airing,
  type AiringItem,
  type Anime,
  type AnimeDetail,
  type OfficialEpisode,
  type TitleSet,
  type TrackingData,
  type WatchLink,
} from './types';
import { safeHttpsUrl, YT_ID } from '../sources';

// Raw shapes are deliberately loose: every field of a remote payload may be missing or null.
export interface RawFuzzyDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export interface RawAiring {
  id?: number | null;
  episode?: number | null;
  airingAt?: number | null;
  mediaId?: number | null;
  media?: RawMedia | null;
}

export interface RawMedia {
  id?: number | null;
  type?: string | null;
  isAdult?: boolean | null;
  title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
  coverImage?: { large?: string | null; medium?: string | null } | null;
  bannerImage?: string | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  averageScore?: number | null;
  popularity?: number | null;
  genres?: (string | null)[] | null;
  season?: string | null;
  seasonYear?: number | null;
  nextAiringEpisode?: RawAiring | null;
}

export interface RawMediaDetail extends RawMedia {
  description?: string | null;
  duration?: number | null;
  source?: string | null;
  siteUrl?: string | null;
  startDate?: RawFuzzyDate | null;
  endDate?: RawFuzzyDate | null;
  studios?: { nodes?: ({ name?: string | null } | null)[] | null } | null;
  trailer?: { id?: string | null; site?: string | null } | null;
  externalLinks?: ({ url?: string | null; site?: string | null; type?: string | null; language?: string | null } | null)[] | null;
  streamingEpisodes?: ({ title?: string | null; url?: string | null; site?: string | null } | null)[] | null;
  airingSchedule?: { nodes?: (RawAiring | null)[] | null } | null;
  relations?: { edges?: ({ relationType?: string | null; node?: RawMedia | null } | null)[] | null } | null;
  recommendations?: { nodes?: ({ mediaRecommendation?: RawMedia | null } | null)[] | null } | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Remote synopsis -> plain text. The result is only ever rendered as a text node. */
export function cleanDescription(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw === '') return '';
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const httpsOrNull = safeHttpsUrl;

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const int = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;

function mapTitle(raw: RawMedia['title']): TitleSet {
  return { romaji: text(raw?.romaji), english: text(raw?.english), native: text(raw?.native) };
}

function mapAiring(raw: RawAiring | null | undefined): Airing | null {
  const episode = int(raw?.episode);
  const airingAt = int(raw?.airingAt);
  if (episode === null || airingAt === null || episode < 1 || airingAt <= 0) return null;
  return { episode, airingAt };
}

/** Returns null for anything that must not reach the UI: missing id, adult entries, non-anime media. */
export function mapAnime(raw: RawMedia | null | undefined): Anime | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = int(raw.id);
  if (id === null || id <= 0) return null;
  if (raw.isAdult === true) return null;
  if (raw.type !== undefined && raw.type !== null && raw.type !== 'ANIME') return null;
  return {
    id,
    title: mapTitle(raw.title),
    cover: httpsOrNull(raw.coverImage?.large) ?? httpsOrNull(raw.coverImage?.medium),
    coverSmall: httpsOrNull(raw.coverImage?.medium) ?? httpsOrNull(raw.coverImage?.large),
    banner: httpsOrNull(raw.bannerImage),
    format: oneOf(raw.format, ANIME_FORMATS),
    status: oneOf(raw.status, ANIME_STATUSES),
    episodes: int(raw.episodes),
    score: int(raw.averageScore),
    popularity: int(raw.popularity),
    genres: Array.isArray(raw.genres) ? raw.genres.filter((g): g is string => typeof g === 'string' && g !== '') : [],
    season: oneOf(raw.season, SEASONS),
    seasonYear: int(raw.seasonYear),
    nextAiring: mapAiring(raw.nextAiringEpisode),
  };
}

export function mapAnimeList(raws: (RawMedia | null | undefined)[] | null | undefined): Anime[] {
  if (!Array.isArray(raws)) return [];
  const seen = new Set<number>();
  const out: Anime[] = [];
  for (const raw of raws) {
    const anime = mapAnime(raw);
    if (!anime || seen.has(anime.id)) continue;
    seen.add(anime.id);
    out.push(anime);
  }
  return out;
}

export function mapAiringItem(raw: RawAiring | null | undefined): AiringItem | null {
  const airing = mapAiring(raw);
  const id = int(raw?.id);
  const anime = mapAnime(raw?.media);
  if (!airing || id === null || !anime) return null;
  return { id, ...airing, anime };
}

export function mapAiringItems(raws: (RawAiring | null | undefined)[] | null | undefined): AiringItem[] {
  if (!Array.isArray(raws)) return [];
  const seen = new Set<number>();
  const out: AiringItem[] = [];
  for (const raw of raws) {
    const item = mapAiringItem(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function mapFuzzyDate(raw: RawFuzzyDate | null | undefined): string | null {
  const year = int(raw?.year);
  if (year === null || year < 1900 || year > 2200) return null;
  const month = int(raw?.month);
  if (month === null || month < 1 || month > 12) return String(year);
  const mm = String(month).padStart(2, '0');
  const day = int(raw?.day);
  if (day === null || day < 1 || day > 31) return `${year}-${mm}`;
  return `${year}-${mm}-${String(day).padStart(2, '0')}`;
}

function mapLinks(raw: RawMediaDetail['externalLinks']): WatchLink[] {
  const out: WatchLink[] = [];
  for (const link of raw ?? []) {
    const url = httpsOrNull(link?.url);
    const site = text(link?.site);
    if (!link || link.type !== 'STREAMING' || !url || !site) continue;
    out.push({ site: site.trim(), url, language: text(link.language) });
  }
  return out;
}

function mapOfficialEpisodes(raw: RawMediaDetail['streamingEpisodes']): OfficialEpisode[] {
  const out: OfficialEpisode[] = [];
  for (const episode of raw ?? []) {
    const url = httpsOrNull(episode?.url);
    if (!url) continue;
    out.push({ title: text(episode?.title)?.trim() ?? '', url, site: text(episode?.site)?.trim() ?? '' });
  }
  return out;
}

/** Null means "treat as not found" (missing, adult or not an anime). */
export function mapDetail(raw: RawMediaDetail | null | undefined): AnimeDetail | null {
  const base = mapAnime(raw);
  if (!raw || !base) return null;

  const trailerId = raw.trailer?.site?.toLowerCase() === 'youtube' ? text(raw.trailer.id) : null;
  const upcoming = (raw.airingSchedule?.nodes ?? [])
    .map(mapAiring)
    .filter((a): a is Airing => a !== null)
    .sort((a, b) => a.airingAt - b.airingAt);

  const relations: AnimeDetail['relations'] = [];
  for (const edge of raw.relations?.edges ?? []) {
    const anime = mapAnime(edge?.node);
    if (anime && anime.id !== base.id) relations.push({ relation: text(edge?.relationType) ?? 'OTHER', anime });
  }

  return {
    ...base,
    description: cleanDescription(raw.description),
    duration: int(raw.duration),
    source: text(raw.source),
    studios: (raw.studios?.nodes ?? []).map((s) => text(s?.name)).filter((s): s is string => s !== null),
    startDate: mapFuzzyDate(raw.startDate),
    endDate: mapFuzzyDate(raw.endDate),
    trailerYoutubeId: trailerId && YT_ID.test(trailerId) ? trailerId : null,
    links: mapLinks(raw.externalLinks),
    officialEpisodes: mapOfficialEpisodes(raw.streamingEpisodes),
    upcoming,
    relations,
    recommendations: mapAnimeList((raw.recommendations?.nodes ?? []).map((n) => n?.mediaRecommendation)).filter(
      (a) => a.id !== base.id,
    ),
    siteUrl: httpsOrNull(raw.siteUrl) ?? `https://anilist.co/anime/${base.id}`,
  };
}

export function mapTracking(
  media: (RawMedia | null | undefined)[] | null | undefined,
  airing: (RawAiring | null | undefined)[] | null | undefined,
): TrackingData {
  const anime = mapAnimeList(media);
  const allowed = new Set(anime.map((a) => a.id));
  const seen = new Set<string>();
  const out: TrackingData['airing'] = [];
  for (const raw of airing ?? []) {
    const slot = mapAiring(raw);
    const mediaId = int(raw?.mediaId);
    if (!slot || mediaId === null || !allowed.has(mediaId)) continue;
    const key = `${mediaId}:${slot.episode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ mediaId, ...slot });
  }
  out.sort((a, b) => a.airingAt - b.airingAt);
  return { anime, airing: out };
}
