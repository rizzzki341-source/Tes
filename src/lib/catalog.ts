import type { AnimeFormat, AnimeStatus, Season, SortKey, TitleSet } from './anilist/types';
import type { ListStatus, TitleLang } from '../store/library';

/** AniList genre ids with Indonesian labels. Adult genres are left out on purpose. */
export const GENRES: { id: string; label: string }[] = [
  { id: 'Action', label: 'Aksi' },
  { id: 'Adventure', label: 'Petualangan' },
  { id: 'Comedy', label: 'Komedi' },
  { id: 'Drama', label: 'Drama' },
  { id: 'Fantasy', label: 'Fantasi' },
  { id: 'Horror', label: 'Horor' },
  { id: 'Mahou Shoujo', label: 'Mahou Shoujo' },
  { id: 'Mecha', label: 'Mecha' },
  { id: 'Music', label: 'Musik' },
  { id: 'Mystery', label: 'Misteri' },
  { id: 'Psychological', label: 'Psikologis' },
  { id: 'Romance', label: 'Romantis' },
  { id: 'Sci-Fi', label: 'Fiksi ilmiah' },
  { id: 'Slice of Life', label: 'Keseharian' },
  { id: 'Sports', label: 'Olahraga' },
  { id: 'Supernatural', label: 'Supernatural' },
  { id: 'Thriller', label: 'Thriller' },
];

export const FORMAT_LABEL: Record<AnimeFormat, string> = {
  TV: 'Seri TV',
  TV_SHORT: 'Seri pendek',
  MOVIE: 'Film',
  SPECIAL: 'Spesial',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Musik',
};

export const STATUS_LABEL: Record<AnimeStatus, string> = {
  RELEASING: 'Sedang tayang',
  FINISHED: 'Tamat',
  NOT_YET_RELEASED: 'Belum tayang',
  CANCELLED: 'Dibatalkan',
  HIATUS: 'Hiatus',
};

export const SORT_LABEL: Record<SortKey, string> = {
  POPULARITY_DESC: 'Paling populer',
  TRENDING_DESC: 'Lagi ramai',
  SCORE_DESC: 'Skor tertinggi',
  START_DATE_DESC: 'Paling baru',
  SEARCH_MATCH: 'Paling cocok',
};

export const SEASON_LABEL: Record<Season, string> = {
  WINTER: 'Musim dingin',
  SPRING: 'Musim semi',
  SUMMER: 'Musim panas',
  FALL: 'Musim gugur',
};

export const LIST_LABEL: Record<ListStatus, string> = {
  plan: 'Ingin ditonton',
  watching: 'Sedang ditonton',
  done: 'Selesai',
};

export const TITLE_LANG_LABEL: Record<TitleLang, string> = {
  romaji: 'Romaji',
  english: 'Inggris',
  native: 'Jepang (asli)',
};

const RELATION_LABEL: Record<string, string> = {
  SEQUEL: 'Sekuel',
  PREQUEL: 'Prekuel',
  PARENT: 'Cerita utama',
  SIDE_STORY: 'Cerita sampingan',
  SPIN_OFF: 'Spin-off',
  ALTERNATIVE: 'Versi lain',
  SUMMARY: 'Rangkuman',
  COMPILATION: 'Kompilasi',
  CHARACTER: 'Karakter sama',
  ADAPTATION: 'Adaptasi',
  SOURCE: 'Sumber cerita',
  CONTAINS: 'Berisi',
  OTHER: 'Terkait',
};

const SOURCE_LABEL: Record<string, string> = {
  ORIGINAL: 'Cerita orisinal',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light novel',
  VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Gim',
  NOVEL: 'Novel',
  WEB_NOVEL: 'Novel web',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime',
  LIVE_ACTION: 'Live action',
  GAME: 'Gim',
  COMIC: 'Komik',
  MULTIMEDIA_PROJECT: 'Proyek multimedia',
  PICTURE_BOOK: 'Buku bergambar',
  OTHER: 'Lainnya',
};

export function pickTitle(t: TitleSet, lang: TitleLang): string {
  return t[lang] || t.romaji || t.english || t.native || 'Tanpa judul';
}

export function genreLabel(id: string): string {
  return GENRES.find((g) => g.id === id)?.label ?? id;
}

export function relationLabel(relation: string): string {
  return RELATION_LABEL[relation] ?? RELATION_LABEL.OTHER!;
}

export function sourceLabel(source: string | null): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source] ?? SOURCE_LABEL.OTHER!;
}

/** 0-100 -> '8,6' (Indonesian decimal comma). Null when there is no score yet. */
export function formatScore(score: number | null | undefined): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return null;
  return (score / 10).toFixed(1).replace('.', ',');
}
