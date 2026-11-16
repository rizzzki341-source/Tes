import { useMemo } from 'react';
import { buildInbox, type InboxItem } from '../lib/notifications';
import { useTracking } from '../lib/query';
import { useLibrary } from '../store/library';
import { useNow } from './useNow';

/** Inbox items (newest first) and how many aired after the inbox was last marked as read. */
export function useInbox(): { items: InboxItem[]; unread: number } {
  const { data } = useTracking();
  const entries = useLibrary((state) => state.entries);
  const inboxReadAt = useLibrary((state) => state.inboxReadAt);
  const now = useNow(60_000);

  return useMemo(() => {
    const items = data ? buildInbox(Object.values(entries), data, now) : [];
    return { items, unread: items.filter((item) => item.atMs > inboxReadAt).length };
  }, [data, entries, inboxReadAt, now]);
}
