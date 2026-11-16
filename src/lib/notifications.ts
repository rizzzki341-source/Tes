import type { TitleSet, TrackingData } from './anilist/types';
import { pickTitle } from './catalog';
import { isNative } from './platform';
import type { LibraryEntry, TitleLang } from '../store/library';

export interface PlannedAlert {
  id: number;
  mediaId: number;
  episode: number;
  atMs: number;
  title: string;
  body: string;
  finale: boolean;
}

export interface InboxItem {
  key: string;
  mediaId: number;
  episode: number;
  atMs: number;
  finale: boolean;
  title: TitleSet;
  cover: string | null;
}

export const ALERT_CHANNEL_ID = 'episodes';
export const ALERT_CHANNEL_NAME = 'Episode baru';
export const INBOX_WINDOW_MS = 30 * 86_400_000;
const DEFAULT_MAX_ALERTS = 60;

/**
 * Stable positive 31-bit id: 19 bits of media id, 12 bits of episode.
 * Collision-free for media ids below 524 288 and episodes below 4 096.
 */
export function alertId(mediaId: number, episode: number): number {
  const media = Math.abs(Math.trunc(mediaId)) % 524_288;
  const ep = Math.abs(Math.trunc(episode)) % 4096;
  return media * 4096 + ep || 1;
}

function subscribedById(entries: LibraryEntry[]): Map<number, LibraryEntry> {
  const map = new Map<number, LibraryEntry>();
  for (const entry of entries) if (entry.subscribed) map.set(entry.id, entry);
  return map;
}

interface Slot {
  mediaId: number;
  episode: number;
  airingAt: number;
}

/** Schedule rows plus each title's `nextAiring`, one per media/episode. */
function slots(tracking: TrackingData): Slot[] {
  const seen = new Set<string>();
  const out: Slot[] = [];
  const add = (slot: Slot) => {
    const key = `${slot.mediaId}:${slot.episode}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(slot);
  };
  for (const row of tracking.airing) add(row);
  for (const anime of tracking.anime) {
    if (anime.nextAiring) add({ mediaId: anime.id, ...anime.nextAiring });
  }
  return out;
}

/** Future airings of subscribed titles, soonest first. */
export function planAlerts(
  entries: LibraryEntry[],
  tracking: TrackingData,
  nowMs: number,
  titleLang: TitleLang,
  max: number = DEFAULT_MAX_ALERTS,
): PlannedAlert[] {
  const subscribed = subscribedById(entries);
  const fresh = new Map(tracking.anime.map((a) => [a.id, a]));
  const planned: PlannedAlert[] = [];
  for (const slot of slots(tracking)) {
    const entry = subscribed.get(slot.mediaId);
    const atMs = slot.airingAt * 1000;
    if (!entry || atMs <= nowMs) continue;
    const anime = fresh.get(slot.mediaId);
    const total = anime?.episodes ?? entry.snapshot.episodes;
    const finale = total !== null && slot.episode === total;
    planned.push({
      id: alertId(slot.mediaId, slot.episode),
      mediaId: slot.mediaId,
      episode: slot.episode,
      atMs,
      title: pickTitle(anime?.title ?? entry.snapshot.title, titleLang),
      body: finale ? `Episode ${slot.episode} sudah tayang. Ini episode terakhirnya.` : `Episode ${slot.episode} sudah tayang.`,
      finale,
    });
  }
  planned.sort((a, b) => a.atMs - b.atMs || a.id - b.id);
  return planned.slice(0, Math.max(0, max));
}

export function diffAlerts(desired: PlannedAlert[], pendingIds: number[]): { cancel: number[]; schedule: PlannedAlert[] } {
  const wanted = new Set(desired.map((a) => a.id));
  const pending = new Set(pendingIds);
  return {
    cancel: [...pending].filter((id) => !wanted.has(id)),
    schedule: desired.filter((a) => !pending.has(a.id)),
  };
}

/** Episodes that aired after the title was subscribed to, last 30 days, newest first. */
export function buildInbox(entries: LibraryEntry[], tracking: TrackingData, nowMs: number): InboxItem[] {
  const subscribed = subscribedById(entries);
  const fresh = new Map(tracking.anime.map((a) => [a.id, a]));
  const items: InboxItem[] = [];
  for (const slot of slots(tracking)) {
    const entry = subscribed.get(slot.mediaId);
    const atMs = slot.airingAt * 1000;
    if (!entry || entry.subscribedAt === null) continue;
    if (atMs > nowMs || atMs <= entry.subscribedAt || atMs < nowMs - INBOX_WINDOW_MS) continue;
    const anime = fresh.get(slot.mediaId);
    const total = anime?.episodes ?? entry.snapshot.episodes;
    items.push({
      key: `${slot.mediaId}:${slot.episode}`,
      mediaId: slot.mediaId,
      episode: slot.episode,
      atMs,
      finale: total !== null && slot.episode === total,
      title: anime?.title ?? entry.snapshot.title,
      cover: anime?.cover ?? entry.snapshot.cover,
    });
  }
  return items.sort((a, b) => b.atMs - a.atMs || b.mediaId - a.mediaId);
}

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

/** Makes the device's pending alerts match `desired`. Pass `[]` to cancel everything. */
export async function syncNativeAlerts(desired: PlannedAlert[]): Promise<'unsupported' | 'denied' | 'synced'> {
  if (!isNative()) return 'unsupported';
  try {
    const notifications = await plugin();
    const pending = (await notifications.getPending()).notifications;
    const wanted = new Map(desired.map((a) => [a.id, a]));
    // An alert whose air time moved is left out of the pending ids so it gets scheduled again
    // (scheduling an existing id replaces it).
    const pendingIds = pending
      .filter((n) => {
        const target = wanted.get(n.id);
        const at = n.schedule?.at ? new Date(n.schedule.at).getTime() : NaN;
        return !target || at === target.atMs;
      })
      .map((n) => n.id);
    const { cancel, schedule } = diffAlerts(desired, pendingIds);

    if (cancel.length > 0) await notifications.cancel({ notifications: cancel.map((id) => ({ id })) });
    if (schedule.length === 0) return 'synced';

    const permission = await notifications.checkPermissions();
    if (permission.display !== 'granted') return 'denied';
    await notifications.schedule({
      notifications: schedule.map((alert) => ({
        id: alert.id,
        title: alert.title,
        body: alert.body,
        channelId: ALERT_CHANNEL_ID,
        schedule: { at: new Date(alert.atMs), allowWhileIdle: true },
        extra: { mediaId: alert.mediaId, episode: alert.episode },
      })),
    });
    return 'synced';
  } catch {
    return 'unsupported';
  }
}

/** Asks for the notification permission when the system still allows asking. */
export async function ensureAlertPermission(): Promise<'unsupported' | 'granted' | 'denied'> {
  if (!isNative()) return 'unsupported';
  try {
    const notifications = await plugin();
    let state = (await notifications.checkPermissions()).display;
    if (state !== 'granted') state = (await notifications.requestPermissions()).display;
    return state === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
