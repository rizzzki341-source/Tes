import { useEffect } from 'react';
import { planAlerts, syncNativeAlerts } from '../lib/notifications';
import { isNative } from '../lib/platform';
import { useTracking } from '../lib/query';
import { useLibrary } from '../store/library';

/**
 * Keeps saved snapshots and the device's scheduled episode alerts in step with tracking data.
 * Mounted once by the app shell.
 */
export function useAlertsSync(): void {
  const { data, dataUpdatedAt, isPlaceholderData } = useTracking();
  const entries = useLibrary((state) => state.entries);
  const alerts = useLibrary((state) => state.settings.alerts);
  const titleLang = useLibrary((state) => state.settings.titleLang);
  const refreshSnapshot = useLibrary((state) => state.refreshSnapshot);

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    for (const anime of data.anime) refreshSnapshot(anime);
  }, [data, dataUpdatedAt, isPlaceholderData, refreshSnapshot]);

  useEffect(() => {
    if (!isNative()) return;
    const list = Object.values(entries);
    const anySubscribed = list.some((entry) => entry.subscribed);
    if (!alerts || !anySubscribed) {
      void syncNativeAlerts([]);
      return;
    }
    if (!data || isPlaceholderData) return;
    void syncNativeAlerts(planAlerts(list, data, Date.now(), titleLang));
  }, [alerts, data, dataUpdatedAt, entries, isPlaceholderData, titleLang]);
}
