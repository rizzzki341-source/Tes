import type { PersistedLibrary, TitleLang } from '../store/library';
import { libraryTotals } from './library.helpers';

export type AlertPermission = 'unsupported' | 'granted' | 'denied';

export const TITLE_LANG_ORDER: readonly TitleLang[] = ['romaji', 'english', 'native'];

/** One sample title per language, so the choice is clear before it is made. */
export const TITLE_LANG_EXAMPLE: Record<TitleLang, string> = {
  romaji: 'Contoh: Sousou no Frieren',
  english: 'Contoh: Frieren: Beyond Journey’s End',
  native: 'Contoh: 葬送のフリーレン',
};

/** What a backup holds, for the question asked before it replaces the current data. */
export function backupSummary(data: PersistedLibrary): string {
  const totals = libraryTotals(data.entries);
  return `${totals.titles} judul, ${totals.subscribed} langganan, ${data.history.length} catatan riwayat`;
}

/** Explanation shown under the reminder switch; null when there is nothing to explain. */
export function alertNote(permission: AlertPermission | null): string | null {
  if (permission === 'denied') {
    return 'Izin notifikasi belum diberikan, jadi pengingat dimatikan lagi. Buka Pengaturan Android > Aplikasi > myanime > Notifikasi, izinkan, lalu nyalakan lagi di sini.';
  }
  if (permission === 'unsupported') {
    return 'Di perangkat ini pengingat tidak bisa berbunyi. Bunyinya ada di aplikasi Android. Halaman Notifikasi di dalam myanime tetap jalan di mana saja.';
  }
  return null;
}
