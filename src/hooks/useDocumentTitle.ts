import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { create } from 'zustand';

export const APP_NAME = 'myanime';

interface ShellTitleState {
  title: string;
  /** Route the title was set on, so the shell never shows the previous screen's title. */
  path: string;
  setTitle(title: string, path: string): void;
}

const useShellTitleStore = create<ShellTitleState>()((set) => ({
  title: '',
  path: '',
  setTitle: (title, path) => set({ title, path }),
}));

/** The title set by the screen at `path`, or '' while that screen has not set one yet. */
export function useShellTitle(path: string): string {
  return useShellTitleStore((state) => (state.path === path ? state.title : ''));
}

/**
 * Sets `document.title` ("<title> · myanime") and the heading the app shell shows for the screen.
 * Must be called inside the router (every screen is).
 */
export function useDocumentTitle(title: string): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const clean = title.trim();
    document.title = clean === '' ? APP_NAME : `${clean} · ${APP_NAME}`;
    useShellTitleStore.getState().setTitle(clean, pathname);
  }, [title, pathname]);
}
