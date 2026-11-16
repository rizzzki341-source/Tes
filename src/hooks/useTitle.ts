import { useCallback } from 'react';
import type { TitleSet } from '../lib/anilist/types';
import { pickTitle } from '../lib/catalog';
import { useLibrary } from '../store/library';

/** Returns a formatter that picks the title in the language chosen in Pengaturan. */
export function useTitle(): (t: TitleSet) => string {
  const lang = useLibrary((state) => state.settings.titleLang);
  return useCallback((t: TitleSet) => pickTitle(t, lang), [lang]);
}
