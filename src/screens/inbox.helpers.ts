import type { InboxItem } from '../lib/notifications';
import { isNative } from '../lib/platform';
import { formatClock, relativeDayLabel } from '../lib/time';

export const UPCOMING_LIMIT = 10;

export function isUnread(item: Pick<InboxItem, 'atMs'>, readAt: number): boolean {
  return item.atMs > readAt;
}

export function countUnread(items: Pick<InboxItem, 'atMs'>[], readAt: number): number {
  return items.filter((item) => isUnread(item, readAt)).length;
}

/** "Besok, 21.30" | "19 Nov 2026, 21.30" */
export function alertWhenLabel(atMs: number, nowMs: number): string {
  return `${relativeDayLabel(atMs, nowMs)}, ${formatClock(atMs)}`;
}

/** Reads the notification permission without asking for it. */
export async function checkAlertPermission(): Promise<'unsupported' | 'granted' | 'denied'> {
  if (!isNative()) return 'unsupported';
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return (await LocalNotifications.checkPermissions()).display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
