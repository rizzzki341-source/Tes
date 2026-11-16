import { useEffect } from 'react';
import { create } from 'zustand';

export const TOAST_MS = 4000;

interface ToastState {
  message: string | null;
  /** Changes on every call so repeating the same text restarts the timer. */
  seq: number;
  show(message: string): void;
  hide(): void;
}

const useToastStore = create<ToastState>()((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((state) => ({ message, seq: state.seq + 1 })),
  hide: () => set({ message: null }),
}));

/** Shows a short message for 4 seconds. A new call replaces the current one. Callable from anywhere. */
export function toast(message: string): void {
  useToastStore.getState().show(message);
}

/** The live region toasts appear in. Mounted once by AppShell. */
export function ToastHost() {
  const message = useToastStore((state) => state.message);
  const seq = useToastStore((state) => state.seq);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(hide, TOAST_MS);
    return () => clearTimeout(timer);
  }, [message, seq, hide]);

  // The region stays mounted so screen readers announce text changes inside it.
  return (
    <div className="toast-host" role="status" aria-live="polite" aria-atomic="true">
      {message !== null ? (
        <div key={seq} className="toast">
          {message}
        </div>
      ) : null}
    </div>
  );
}
