import { ALERT_CHANNEL_ID, ALERT_CHANNEL_NAME } from './notifications';
import { isNative } from './platform';

/** Routes where the Android back button leaves the app instead of going back. */
export const ROOT_PATHS: readonly string[] = ['/', '/jadwal', '/cari', '/koleksi'];

export function currentHashPath(): string {
  if (typeof window === 'undefined') return '/';
  const path = window.location.hash.replace(/^#/, '').split('?')[0] ?? '';
  return path === '' ? '/' : path;
}

/**
 * Capacitor glue. Does nothing in a browser. Returns a disposer that removes the listeners.
 * `navigate` receives an in-app path such as `/anime/21`.
 */
export function initNative(navigate: (path: string) => void): () => void {
  if (!isNative()) return () => {};

  let disposed = false;
  const handles: { remove: () => Promise<void> }[] = [];
  const keep = (handle: { remove: () => Promise<void> }) => {
    if (disposed) void handle.remove();
    else handles.push(handle);
  };

  void (async () => {
    try {
      const { App } = await import('@capacitor/app');
      keep(
        await App.addListener('backButton', ({ canGoBack }) => {
          const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
          if (dialog) {
            dialog.close();
            return;
          }
          if (ROOT_PATHS.includes(currentHashPath()) || !canGoBack) void App.exitApp();
          else window.history.back();
        }),
      );
    } catch {
      // The shell keeps working without the hardware back handler.
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      keep(
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const mediaId = Number((action.notification.extra as { mediaId?: unknown } | null | undefined)?.mediaId);
          if (Number.isInteger(mediaId) && mediaId > 0) navigate(`/anime/${mediaId}`);
        }),
      );
      await LocalNotifications.createChannel({
        id: ALERT_CHANNEL_ID,
        name: ALERT_CHANNEL_NAME,
        description: 'Kabar saat episode anime langgananmu tayang',
        importance: 4,
        visibility: 1,
      });
    } catch {
      // Alerts are optional; the rest of the app does not depend on them.
    }
  })();

  return () => {
    disposed = true;
    for (const handle of handles.splice(0)) void handle.remove();
  };
}
