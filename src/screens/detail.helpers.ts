import type { AnimeDetail, AnimeStatus, TitleSet } from '../lib/anilist/types';
import { FORMAT_LABEL, SEASON_LABEL, sourceLabel } from '../lib/catalog';
import { formatClock, formatCountdown, formatDateLong, formatPartialDate } from '../lib/time';

/** AniList ids are GraphQL `Int`s. */
const MAX_ID = 2_147_483_647;

/** The `:id` route segment as a positive integer, or null when it is anything else. */
export function parseAnimeId(raw: string | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_ID ? id : null;
}

/** A second title to print under the one being shown (English or romaji first, the native one last). */
export function otherTitle(title: TitleSet, shown: string): string | null {
  for (const candidate of [title.english, title.romaji, title.native]) {
    const clean = candidate?.trim();
    if (clean && clean.toLowerCase() !== shown.trim().toLowerCase()) return clean;
  }
  return null;
}

export function releaseYear(anime: Pick<AnimeDetail, 'seasonYear' | 'startDate'>): number | null {
  if (anime.seasonYear) return anime.seasonYear;
  const match = /^(\d{4})/.exec(anime.startDate ?? '');
  return match ? Number(match[1]) : null;
}

/** "Seri TV · 2026 · 12 episode · 24 menit", without the parts that are unknown. */
export function metaParts(anime: Pick<AnimeDetail, 'format' | 'seasonYear' | 'startDate' | 'episodes' | 'duration'>): string[] {
  const parts: string[] = [];
  if (anime.format) parts.push(FORMAT_LABEL[anime.format]);
  const year = releaseYear(anime);
  if (year) parts.push(String(year));
  // "1 episode" says nothing about a film.
  if (anime.episodes && !(anime.format === 'MOVIE' && anime.episodes === 1)) parts.push(`${anime.episodes} episode`);
  if (anime.duration && anime.duration > 0) parts.push(`${anime.duration} menit`);
  return parts;
}

export function statusTone(status: AnimeStatus | null): 'neutral' | 'accent' | 'warning' {
  if (status === 'RELEASING') return 'accent';
  if (status === 'NOT_YET_RELEASED' || status === 'HIATUS') return 'warning';
  return 'neutral';
}

const RELATION_TEXT: Record<string, string> = {
  SEQUEL: 'Sekuel',
  PREQUEL: 'Prekuel',
  SIDE_STORY: 'Cerita sampingan',
  PARENT: 'Cerita induk',
  ALTERNATIVE: 'Versi alternatif',
  SPIN_OFF: 'Spin-off',
  SUMMARY: 'Ringkasan',
};

/** Card badge for an entry in the "Terkait" rail. */
export function relationText(relation: string | null | undefined): string {
  // The relation is remote text: only own keys count ("constructor" must not reach Object.prototype).
  return relation && Object.hasOwn(RELATION_TEXT, relation) ? RELATION_TEXT[relation]! : 'Lainnya';
}

/** Splits the plain-text synopsis on blank lines; single line breaks stay inside a paragraph. */
export function synopsisParagraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

export const TRANSLATE_LIMIT = 1500;
const TRANSLATE_BASE = 'https://translate.google.com/?sl=en&tl=id&op=translate';

/** Google Translate (English -> Indonesian) opened with the first 1500 characters of `text`. */
export function translateUrl(text: string): string {
  let part = text.trim().slice(0, TRANSLATE_LIMIT);
  // A cut between the halves of a surrogate pair would make encodeURIComponent throw.
  if (/[\uD800-\uDBFF]$/.test(part)) part = part.slice(0, -1);
  try {
    return `${TRANSLATE_BASE}&text=${encodeURIComponent(part)}`;
  } catch {
    return TRANSLATE_BASE;
  }
}

/** "Episode 8 tayang 2 hr 4 j lagi" and its two edge cases. */
export function nextEpisodeText(episode: number, atMs: number, nowMs: number): string {
  if (atMs <= nowMs) return `Episode ${episode} sudah tayang`;
  if (atMs - nowMs < 60_000) return `Episode ${episode} tayang sebentar lagi`;
  return `Episode ${episode} tayang ${formatCountdown(atMs, nowMs)} lagi`;
}

/** "Selasa, 17 November 2026, pukul 21.30" in the device's time zone. */
export function airingDateTime(atMs: number): string {
  return `${formatDateLong(atMs)}, pukul ${formatClock(atMs)}`;
}

export function progressText(done: number, count: number): string {
  return `${Math.min(done, count)} dari ${count} episode ditonton`;
}

export interface Fact {
  label: string;
  value: string;
}

/** Rows of the facts list; a row without a value is left out. */
export function factRows(
  anime: Pick<AnimeDetail, 'studios' | 'source' | 'season' | 'seasonYear' | 'startDate' | 'endDate' | 'title'>,
): Fact[] {
  const season = anime.season ? [SEASON_LABEL[anime.season], anime.seasonYear].filter(Boolean).join(' ') : null;
  const rows: [string, string | null | undefined][] = [
    ['Studio', anime.studios.filter(Boolean).join(', ')],
    ['Sumber', sourceLabel(anime.source)],
    ['Musim', season],
    ['Mulai', formatPartialDate(anime.startDate)],
    ['Selesai', formatPartialDate(anime.endDate)],
    ['Judul asli', anime.title.native?.trim()],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}
