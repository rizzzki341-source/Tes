import type { AiringItem } from '../lib/anilist/types';
import { seasonOf } from '../lib/time';
import { nextUnwatched, type LibraryEntry } from '../store/library';

export interface ContinueItem {
  entry: LibraryEntry;
  /** Next episode to watch; null when every known episode is already marked. */
  next: number | null;
}

/** Library titles in progress, most recently touched first. */
export function continueWatching(entries: LibraryEntry[], max: number = 12): ContinueItem[] {
  return entries
    .filter((entry) => entry.list === 'watching' || (entry.watched.length > 0 && entry.list !== 'done'))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id - b.id)
    .slice(0, Math.max(0, max))
    .map((entry) => ({ entry, next: nextUnwatched(entry) }));
}

export function continueLabel(item: ContinueItem): string {
  return item.next === null ? 'Semua episode sudah ditonton' : `Lanjut Ep ${item.next}`;
}

export function progressLabel(entry: Pick<LibraryEntry, 'watched' | 'snapshot'>): string {
  const total = entry.snapshot.episodes;
  return total === null ? `${entry.watched.length} episode ditonton` : `${entry.watched.length} dari ${total} episode`;
}

/** One card per anime: its newest airing, newest first. */
export function latestPerAnime(items: AiringItem[]): AiringItem[] {
  const newest = new Map<number, AiringItem>();
  for (const item of items) {
    const kept = newest.get(item.anime.id);
    if (!kept || item.airingAt > kept.airingAt || (item.airingAt === kept.airingAt && item.episode > kept.episode)) {
      newest.set(item.anime.id, item);
    }
  }
  return [...newest.values()].sort((a, b) => b.airingAt - a.airingAt || a.anime.id - b.anime.id);
}

export function seasonSearchPath(nowMs: number): string {
  const { season, year } = seasonOf(new Date(nowMs));
  return `/cari?season=${season}&year=${year}&sort=POPULARITY_DESC`;
}
