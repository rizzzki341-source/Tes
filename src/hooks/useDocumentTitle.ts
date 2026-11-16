import { useEffect } from 'react';
import { create } from 'zustand';

export const APP_NAME = 'myanime';

interface ShellTitleState {
  title: string;
  setTitle(title: string): void;
}

const useShellTitleStore = create<ShellTitleState>()((set) => ({
  title: '',
  setTitle: (title) => set({ title }),
}));

/** The title of the screen that is showing; the app shell prints it as the page heading. */
export function useShellTitle(): string {
  return useShellTitleStore((state) => state.title);
}

/** Sets `document.title` ("<title> · myanime") and the heading the app shell shows for the screen. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const clean = title.trim();
    document.title = clean === '' ? APP_NAME : `${clean} · ${APP_NAME}`;
    useShellTitleStore.getState().setTitle(clean);
  }, [title]);
}
