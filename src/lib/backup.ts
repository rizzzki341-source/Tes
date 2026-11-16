import { ANIME_FORMATS, ANIME_STATUSES, type TitleSet } from './anilist/types';
import { safeHttpsUrl } from './sources';
import type { HistoryItem, LibraryEntry, ListStatus, PersistedLibrary, Settings, Snapshot, TitleLang } from '../store/library';

const APP = 'myanime';
const VERSION = 1;
const MAX_TEXT_LENGTH = 2_000_000;
const MAX_ENTRIES = 5000;
const MAX_HISTORY = 500;
const MAX_EPISODE = 10_000;
const MAX_TITLE_LENGTH = 500;
const MAX_URL_LENGTH = 2000;
const TITLE_LANGS: readonly TitleLang[] = ['romaji', 'english', 'native'];
const LIST_STATUSES: readonly ListStatus[] = ['plan', 'watching', 'done'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 0x7fffffff;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8.64e15;
const isEpisode = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_EPISODE;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

function own(obj: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

function titlePart(v: unknown): string | null | undefined {
  if (v === null) return null;
  return typeof v === 'string' && v.length <= MAX_TITLE_LENGTH ? v : undefined;
}

function image(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string' || v.length > MAX_URL_LENGTH) return undefined;
  return safeHttpsUrl(v) ?? undefined;
}

function oneOfOrNull<T extends string>(v: unknown, allowed: readonly T[]): T | null | undefined {
  if (v === null) return null;
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function parseSnapshot(v: unknown, id: number): Snapshot | null {
  if (!isObject(v) || own(v, 'id') !== id) return null;
  const rawTitle = own(v, 'title');
  if (!isObject(rawTitle)) return null;
  const title: Partial<TitleSet> = {};
  for (const key of ['romaji', 'english', 'native'] as const) {
    const part = titlePart(own(rawTitle, key));
    if (part === undefined) return null;
    title[key] = part;
  }
  const cover = image(own(v, 'cover'));
  const coverSmall = image(own(v, 'coverSmall'));
  const format = oneOfOrNull(own(v, 'format'), ANIME_FORMATS);
  const status = oneOfOrNull(own(v, 'status'), ANIME_STATUSES);
  const rawEpisodes = own(v, 'episodes');
  const episodes = rawEpisodes === null ? null : isEpisode(rawEpisodes) ? rawEpisodes : undefined;
  if (cover === undefined || coverSmall === undefined || format === undefined || status === undefined || episodes === undefined) {
    return null;
  }
  return { id, title: title as TitleSet, cover, coverSmall, format, status, episodes };
}

function parseEntry(v: unknown, key: string): LibraryEntry | null {
  if (!/^[1-9]\d{0,9}$/.test(key) || !isObject(v)) return null;
  const id = own(v, 'id');
  if (!isId(id) || String(id) !== key) return null;
  const snapshot = parseSnapshot(own(v, 'snapshot'), id);
  const subscribed = own(v, 'subscribed');
  const rawSubscribedAt = own(v, 'subscribedAt');
  const list = oneOfOrNull(own(v, 'list'), LIST_STATUSES);
  const rawWatched = own(v, 'watched');
  const addedAt = own(v, 'addedAt');
  const updatedAt = own(v, 'updatedAt');
  if (!snapshot || !isBool(subscribed) || list === undefined || !isTime(addedAt) || !isTime(updatedAt)) return null;
  if (rawSubscribedAt !== null && !isTime(rawSubscribedAt)) return null;
  if (!Array.isArray(rawWatched) || rawWatched.length > MAX_EPISODE || !rawWatched.every(isEpisode)) return null;
  const watched = [...new Set(rawWatched)].sort((a, b) => a - b);
  // A subscription without a start time would hide every inbox item; fall back to when it was added.
  const subscribedAt = subscribed ? (rawSubscribedAt ?? addedAt) : null;
  if (!subscribed && list === null && watched.length === 0) return null;
  return { id, snapshot, subscribed, subscribedAt, list, watched, addedAt, updatedAt };
}

function parseHistoryItem(v: unknown): HistoryItem | null {
  if (!isObject(v)) return null;
  const mediaId = own(v, 'mediaId');
  const episode = own(v, 'episode');
  const at = own(v, 'at');
  if (!isId(mediaId) || !isEpisode(episode) || !isTime(at)) return null;
  if (own(v, 'key') !== `${mediaId}:${episode}`) return null;
  return { key: `${mediaId}:${episode}`, mediaId, episode, at };
}

function parseSettings(v: unknown): Settings | null {
  if (!isObject(v)) return null;
  const titleLang = oneOfOrNull(own(v, 'titleLang'), TITLE_LANGS);
  const alerts = own(v, 'alerts');
  const dataSaver = own(v, 'dataSaver');
  if (!titleLang || !isBool(alerts) || !isBool(dataSaver)) return null;
  return { titleLang, alerts, dataSaver };
}

/**
 * Strict structural check of untrusted library data (a pasted backup or whatever is in storage).
 * Returns a rebuilt copy holding only known fields, or null when anything is off.
 */
export function sanitizeLibrary(value: unknown): PersistedLibrary | null {
  try {
    if (!isObject(value)) return null;
    const rawEntries = own(value, 'entries');
    const rawHistory = own(value, 'history');
    const settings = parseSettings(own(value, 'settings'));
    const inboxReadAt = own(value, 'inboxReadAt');
    if (!isObject(rawEntries) || !Array.isArray(rawHistory) || !settings || !isTime(inboxReadAt)) return null;

    const keys = Object.keys(rawEntries);
    if (keys.length > MAX_ENTRIES) return null;
    const entries: Record<string, LibraryEntry> = {};
    for (const key of keys) {
      const entry = parseEntry(rawEntries[key], key);
      if (!entry) return null;
      entries[key] = entry;
    }

    if (rawHistory.length > MAX_HISTORY * 4) return null;
    const seen = new Set<string>();
    const history: HistoryItem[] = [];
    for (const raw of rawHistory) {
      const item = parseHistoryItem(raw);
      if (!item) return null;
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      history.push(item);
    }
    history.sort((a, b) => b.at - a.at);

    return { entries, history: history.slice(0, MAX_HISTORY), settings, inboxReadAt };
  } catch {
    return null;
  }
}

export function exportBackup(state: PersistedLibrary, nowMs: number): string {
  const data: PersistedLibrary = {
    entries: state.entries,
    history: state.history,
    settings: state.settings,
    inboxReadAt: state.inboxReadAt,
  };
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: new Date(nowMs).toISOString(), data });
}

/** Strict validation of pasted text. Never throws; `reason` is ready to show to the user. */
export function parseBackup(text: string): { ok: true; data: PersistedLibrary } | { ok: false; reason: string } {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, reason: 'Teks cadangannya masih kosong.' };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, reason: 'Teks cadangannya terlalu besar.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Teks ini bukan cadangan yang utuh. Coba salin ulang semuanya.' };
  }
  if (!isObject(parsed) || own(parsed, 'app') !== APP) return { ok: false, reason: 'Ini bukan cadangan myanime.' };
  if (own(parsed, 'version') !== VERSION) return { ok: false, reason: 'Versi cadangan ini belum didukung.' };

  const data = sanitizeLibrary(own(parsed, 'data'));
  if (!data) return { ok: false, reason: 'Isi cadangannya rusak atau sudah diubah.' };
  return { ok: true, data };
}
