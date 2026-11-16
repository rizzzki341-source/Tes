import type { AiringItem } from '../lib/anilist/types';

export const SCHEDULE_DAYS = 7;

/** `?hari=` -> 0..6; anything else is today. */
export function parseDayIndex(raw: string | null): number {
  return raw !== null && /^[0-6]$/.test(raw) ? Number(raw) : 0;
}

export function sortAirings(items: AiringItem[]): AiringItem[] {
  return [...items].sort((a, b) => a.airingAt - b.airingAt || a.anime.id - b.anime.id || a.episode - b.episode);
}

export function isFinale(item: Pick<AiringItem, 'episode'> & { anime: { episodes: number | null } }): boolean {
  return item.anime.episodes !== null && item.episode === item.anime.episodes;
}

export function episodeCountLabel(shown: number, total: number, filtered: boolean): string {
  return filtered ? `${shown} dari ${total} episode` : `${total} episode`;
}

/** IANA name of the device zone, e.g. "Asia/Jakarta"; null when the runtime does not report one. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
