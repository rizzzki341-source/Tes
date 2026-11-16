import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getSnapshot = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

/** False only when the browser is sure there is no connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
