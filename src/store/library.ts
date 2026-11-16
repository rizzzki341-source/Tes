import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Anime } from '../lib/anilist/types';
import { sanitizeLibrary } from '../lib/backup';

export type TitleLang = 'romaji' | 'english' | 'native';
export type ListStatus = 'plan' | 'watching' | 'done';
export type Snapshot = Pick<Anime, 'id' | 'title' | 'cover' | 'coverSmall' | 'format' | 'status' | 'episodes'>;

export interface LibraryEntry {
  id: number;
  snapshot: Snapshot;
  subscribed: boolean;
  subscribedAt: number | null;
  list: ListStatus | null;
  watched: number[];
  addedAt: number;
  updatedAt: number;
}

/** key = `${mediaId}:${episode}` */
export interface HistoryItem {
  key: string;
  mediaId: number;
  episode: number;
  at: number;
}

export interface Settings {
  titleLang: TitleLang;
  alerts: boolean;
  dataSaver: boolean;
}

export interface PersistedLibrary {
  entries: Record<string, LibraryEntry>;
  history: HistoryItem[];
  settings: Settings;
  inboxReadAt: number;
}

export interface LibraryActions {
  /** Returns the new subscription state. */
  toggleSubscribe(anime: Snapshot, nowMs: number): boolean;
  setList(anime: Snapshot, status: ListStatus | null, nowMs: number): void;
  setWatched(anime: Snapshot, episode: number, watched: boolean, nowMs: number): void;
  /** Marks episodes 1..episode. */
  markWatchedThrough(anime: Snapshot, episode: number, nowMs: number): void;
  clearProgress(mediaId: number, nowMs: number): void;
  removeHistory(key: string): void;
  clearHistory(): void;
  updateSettings(patch: Partial<Settings>): void;
  markInboxRead(nowMs: number): void;
  replaceAll(data: PersistedLibrary): void;
  resetAll(): void;
  /** Keeps the saved title/cover/status current when fresh data arrives. */
  refreshSnapshot(anime: Snapshot): void;
}

export type LibraryState = PersistedLibrary & LibraryActions;

export const STORAGE_KEY = 'myanime:v1';
export const HISTORY_LIMIT = 500;
export const MAX_EPISODE = 10_000;
export const DEFAULT_SETTINGS: Settings = { titleLang: 'romaji', alerts: true, dataSaver: false };

export function emptyLibrary(): PersistedLibrary {
  return { entries: {}, history: [], settings: { ...DEFAULT_SETTINGS }, inboxReadAt: 0 };
}

/** Copies only the saved fields, so a full Anime can be passed to any action. */
export function toSnapshot(anime: Snapshot): Snapshot {
  return {
    id: anime.id,
    title: { romaji: anime.title.romaji, english: anime.title.english, native: anime.title.native },
    cover: anime.cover,
    coverSmall: anime.coverSmall,
    format: anime.format,
    status: anime.status,
    episodes: anime.episodes,
  };
}

export function historyKey(mediaId: number, episode: number): string {
  return `${mediaId}:${episode}`;
}

/** The first episode that is not marked yet; null when everything known is watched. */
export function nextUnwatched(entry: Pick<LibraryEntry, 'watched' | 'snapshot'>): number | null {
  const watched = new Set(entry.watched);
  let episode = 1;
  while (watched.has(episode)) episode += 1;
  const total = entry.snapshot.episodes;
  return total !== null && episode > total ? null : episode;
}

export function subscribedIds(entries: Record<string, LibraryEntry>): number[] {
  return Object.values(entries)
    .filter((e) => e.subscribed)
    .map((e) => e.id)
    .sort((a, b) => a - b);
}

const validId = (id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0;
const validEpisode = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_EPISODE;
const isEmpty = (entry: LibraryEntry) => !entry.subscribed && entry.list === null && entry.watched.length === 0;

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return (
    a.title.romaji === b.title.romaji &&
    a.title.english === b.title.english &&
    a.title.native === b.title.native &&
    a.cover === b.cover &&
    a.coverSmall === b.coverSmall &&
    a.format === b.format &&
    a.status === b.status &&
    a.episodes === b.episodes
  );
}

/** Existing entry with a refreshed snapshot, or a blank one. */
function draft(entries: Record<string, LibraryEntry>, anime: Snapshot, nowMs: number): LibraryEntry {
  const existing = entries[String(anime.id)];
  const snapshot = toSnapshot(anime);
  if (existing) return { ...existing, snapshot, updatedAt: nowMs };
  return { id: anime.id, snapshot, subscribed: false, subscribedAt: null, list: null, watched: [], addedAt: nowMs, updatedAt: nowMs };
}

function withEntry(entries: Record<string, LibraryEntry>, entry: LibraryEntry): Record<string, LibraryEntry> {
  const next = { ...entries };
  if (isEmpty(entry)) delete next[String(entry.id)];
  else next[String(entry.id)] = entry;
  return next;
}

function pushHistory(history: HistoryItem[], item: HistoryItem): HistoryItem[] {
  return [item, ...history.filter((h) => h.key !== item.key)].slice(0, HISTORY_LIMIT);
}

function listAfterWatching(entry: LibraryEntry, episode: number): ListStatus | null {
  if (entry.snapshot.episodes !== null && episode === entry.snapshot.episodes) return 'done';
  if (entry.list === null || entry.list === 'plan') return 'watching';
  return entry.list;
}

function storage() {
  // Reading `localStorage` throws in some embedded contexts; zustand then keeps the state in memory.
  return createJSONStorage<PersistedLibrary>(() => localStorage);
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...emptyLibrary(),

      toggleSubscribe(anime, nowMs) {
        if (!validId(anime?.id)) return false;
        const entry = draft(get().entries, anime, nowMs);
        entry.subscribed = !entry.subscribed;
        entry.subscribedAt = entry.subscribed ? nowMs : null;
        set({ entries: withEntry(get().entries, entry) });
        return entry.subscribed;
      },

      setList(anime, status, nowMs) {
        if (!validId(anime?.id)) return;
        const entry = draft(get().entries, anime, nowMs);
        entry.list = status;
        set({ entries: withEntry(get().entries, entry) });
      },

      setWatched(anime, episode, watched, nowMs) {
        if (!validId(anime?.id) || !validEpisode(episode)) return;
        const state = get();
        const entry = draft(state.entries, anime, nowMs);
        const key = historyKey(anime.id, episode);
        if (watched) {
          entry.watched = [...new Set([...entry.watched, episode])].sort((a, b) => a - b);
          entry.list = listAfterWatching(entry, episode);
          set({
            entries: withEntry(state.entries, entry),
            history: pushHistory(state.history, { key, mediaId: anime.id, episode, at: nowMs }),
          });
        } else {
          entry.watched = entry.watched.filter((n) => n !== episode);
          set({ entries: withEntry(state.entries, entry), history: state.history.filter((h) => h.key !== key) });
        }
      },

      markWatchedThrough(anime, episode, nowMs) {
        if (!validId(anime?.id) || !validEpisode(episode)) return;
        const state = get();
        const entry = draft(state.entries, anime, nowMs);
        const through = Array.from({ length: episode }, (_, i) => i + 1);
        entry.watched = [...new Set([...entry.watched, ...through])].sort((a, b) => a - b);
        entry.list = listAfterWatching(entry, episode);
        // One history line for the batch; a line per episode would flood the list.
        set({
          entries: withEntry(state.entries, entry),
          history: pushHistory(state.history, { key: historyKey(anime.id, episode), mediaId: anime.id, episode, at: nowMs }),
        });
      },

      clearProgress(mediaId, nowMs) {
        const state = get();
        const existing = state.entries[String(mediaId)];
        const history = state.history.filter((h) => h.mediaId !== mediaId);
        if (!existing) {
          if (history.length !== state.history.length) set({ history });
          return;
        }
        set({ entries: withEntry(state.entries, { ...existing, watched: [], updatedAt: nowMs }), history });
      },

      removeHistory(key) {
        set({ history: get().history.filter((h) => h.key !== key) });
      },

      clearHistory() {
        set({ history: [] });
      },

      updateSettings(patch) {
        set({ settings: { ...get().settings, ...patch } });
      },

      markInboxRead(nowMs) {
        set({ inboxReadAt: nowMs });
      },

      replaceAll(data) {
        set({ entries: data.entries, history: data.history.slice(0, HISTORY_LIMIT), settings: data.settings, inboxReadAt: data.inboxReadAt });
      },

      resetAll() {
        set(emptyLibrary());
      },

      refreshSnapshot(anime) {
        if (!validId(anime?.id)) return;
        const entries = get().entries;
        const existing = entries[String(anime.id)];
        if (!existing) return;
        const snapshot = toSnapshot(anime);
        if (sameSnapshot(existing.snapshot, snapshot)) return;
        set({ entries: { ...entries, [String(anime.id)]: { ...existing, snapshot } } });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: storage(),
      partialize: (state): PersistedLibrary => ({
        entries: state.entries,
        history: state.history,
        settings: state.settings,
        inboxReadAt: state.inboxReadAt,
      }),
      // Whatever sits in storage is re-validated; damaged pieces are dropped, the rest is kept.
      merge: (persisted, current) => ({ ...current, ...(sanitizeLibrary(persisted, 'lenient') ?? {}) }),
    },
  ),
);

export function useEntry(mediaId: number): LibraryEntry | undefined {
  return useLibrary((state) => state.entries[String(mediaId)]);
}
