import type { TrackingData } from '../lib/anilist/types';
import { relativeDayLabel } from '../lib/time';
import type { HistoryItem, LibraryEntry, ListStatus } from '../store/library';

export type LibraryTab = 'langganan' | 'daftar' | 'riwayat';
export const LIBRARY_TABS: readonly LibraryTab[] = ['langganan', 'daftar', 'riwayat'];
export const DEFAULT_TAB: LibraryTab = 'langganan';

export type ListFilter = 'all' | ListStatus;
export const LIST_FILTERS: readonly ListFilter[] = ['all', 'plan', 'watching', 'done'];

export function parseTab(value: string | null): LibraryTab {
  return LIBRARY_TABS.find((tab) => tab === value) ?? DEFAULT_TAB;
}

export function parseListFilter(value: string | null): ListFilter {
  return LIST_FILTERS.find((filter) => filter === value) ?? 'all';
}

/** Query string for the screen; defaults are left out. */
export function libraryUrlParams(tab: LibraryTab, filter: ListFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (tab !== DEFAULT_TAB) params.set('tab', tab);
  if (tab === 'daftar' && filter !== 'all') params.set('status', filter);
  return params;
}

export function libraryTotals(entries: Record<string, LibraryEntry>): { titles: number; episodes: number; subscribed: number } {
  const all = Object.values(entries);
  return {
    titles: all.length,
    episodes: all.reduce((sum, entry) => sum + entry.watched.length, 0),
    subscribed: all.filter((entry) => entry.subscribed).length,
  };
}

/** Newest subscription first. */
export function subscribedEntries(entries: Record<string, LibraryEntry>): LibraryEntry[] {
  return Object.values(entries)
    .filter((entry) => entry.subscribed)
    .sort((a, b) => (b.subscribedAt ?? 0) - (a.subscribedAt ?? 0) || a.id - b.id);
}

/** Titles on a list, most recently updated first. */
export function listEntries(entries: Record<string, LibraryEntry>, filter: ListFilter): LibraryEntry[] {
  return Object.values(entries)
    .filter((entry) => entry.list !== null && (filter === 'all' || entry.list === filter))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id - b.id);
}

/** The soonest episode that has not aired yet, from either the schedule rows or the title's own next airing. */
export function nextEpisode(
  mediaId: number,
  tracking: TrackingData | undefined,
  nowMs: number,
): { episode: number; atMs: number } | null {
  if (!tracking) return null;
  let best: { episode: number; atMs: number } | null = null;
  const consider = (episode: number, airingAt: number) => {
    const atMs = airingAt * 1000;
    if (!Number.isFinite(atMs) || atMs <= nowMs) return;
    if (best === null || atMs < best.atMs) best = { episode, atMs };
  };
  for (const row of tracking.airing) {
    if (row.mediaId === mediaId) consider(row.episode, row.airingAt);
  }
  const next = tracking.anime.find((anime) => anime.id === mediaId)?.nextAiring;
  if (next) consider(next.episode, next.airingAt);
  return best;
}

/** "3/12", or "3 episode" while the total is unknown; `spoken` is the same thing in full words. */
export function progressLabel(entry: Pick<LibraryEntry, 'watched' | 'snapshot'>): { text: string; spoken: string } {
  const watched = entry.watched.length;
  const total = entry.snapshot.episodes;
  if (total === null) return { text: `${watched} episode`, spoken: `${watched} episode ditonton` };
  return { text: `${watched}/${total}`, spoken: `${watched} dari ${total} episode ditonton` };
}

export interface HistoryGroup {
  label: string;
  items: HistoryItem[];
}

/** Newest first, split by local day ("Hari ini", "Kemarin", "3 hari lalu", then dates). */
export function groupHistory(history: HistoryItem[], nowMs: number): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const sorted = [...history].sort((a, b) => b.at - a.at);
  for (const item of sorted) {
    const label = relativeDayLabel(item.at, nowMs);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
