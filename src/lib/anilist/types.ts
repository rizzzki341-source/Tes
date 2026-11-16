export type TitleSet = { romaji: string | null; english: string | null; native: string | null };
export type AnimeFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type AnimeStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

/** `airingAt` is in unix seconds. */
export interface Airing {
  episode: number;
  airingAt: number;
}

export interface Anime {
  id: number;
  title: TitleSet;
  cover: string | null;
  coverSmall: string | null;
  banner: string | null;
  format: AnimeFormat | null;
  status: AnimeStatus | null;
  episodes: number | null;
  /** 0-100 */
  score: number | null;
  popularity: number | null;
  genres: string[];
  season: Season | null;
  seasonYear: number | null;
  nextAiring: Airing | null;
}

export interface AiringItem extends Airing {
  id: number;
  anime: Anime;
}

export interface WatchLink {
  site: string;
  url: string;
  language: string | null;
}

export interface OfficialEpisode {
  title: string;
  url: string;
  site: string;
}

export interface AnimeDetail extends Anime {
  /** Plain text: tags stripped, `<br>` turned into newlines. */
  description: string;
  duration: number | null;
  source: string | null;
  studios: string[];
  /** 'YYYY-MM-DD', 'YYYY-MM' or 'YYYY' */
  startDate: string | null;
  endDate: string | null;
  trailerYoutubeId: string | null;
  /** externalLinks with type STREAMING only */
  links: WatchLink[];
  officialEpisodes: OfficialEpisode[];
  upcoming: Airing[];
  /** ANIME, non-adult only */
  relations: { relation: string; anime: Anime }[];
  recommendations: Anime[];
  siteUrl: string;
}

export type SortKey = 'POPULARITY_DESC' | 'TRENDING_DESC' | 'SCORE_DESC' | 'START_DATE_DESC' | 'SEARCH_MATCH';

export interface SearchParams {
  q: string;
  genre: string | null;
  format: AnimeFormat | null;
  status: AnimeStatus | null;
  year: number | null;
  season: Season | null;
  sort: SortKey;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  hasNext: boolean;
}

export interface HomeData {
  trending: Anime[];
  latest: AiringItem[];
  season: Anime[];
  upcoming: Anime[];
  movies: Anime[];
  top: Anime[];
}

export interface TrackingData {
  anime: Anime[];
  airing: { mediaId: number; episode: number; airingAt: number }[];
}

export const ANIME_FORMATS: readonly AnimeFormat[] = ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'];
export const ANIME_STATUSES: readonly AnimeStatus[] = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'];
export const SEASONS: readonly Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
export const SORT_KEYS: readonly SortKey[] = ['POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'START_DATE_DESC', 'SEARCH_MATCH'];
