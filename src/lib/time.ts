import type { Season } from './anilist/types';

// Every function takes the clock as an argument; nothing here reads Date.now().
// Day and month names are spelled out so labels do not depend on the device's ICU data.

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;
const SEASON_ORDER: readonly Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Anime seasons start in January, April, July and October. */
export function seasonOf(d: Date): { season: Season; year: number } {
  return { season: SEASON_ORDER[Math.floor(d.getMonth() / 3)]!, year: d.getFullYear() };
}

export function nextSeasonOf(d: Date): { season: Season; year: number } {
  const current = seasonOf(d);
  const index = SEASON_ORDER.indexOf(current.season);
  return index === 3
    ? { season: 'WINTER', year: current.year + 1 }
    : { season: SEASON_ORDER[index + 1]!, year: current.year };
}

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar arithmetic: a day that is 23 or 25 hours long (DST) still counts as one day. */
export function addDays(dayStartMs: number, n: number): number {
  const d = new Date(dayStartMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

/** Whole calendar days from `nowMs` to `ms` in the local zone (negative = past). */
export function dayDiff(ms: number, nowMs: number): number {
  const a = new Date(ms);
  const b = new Date(nowMs);
  // Comparing UTC midnights of the local calendar dates keeps DST shifts out of the result.
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / DAY_MS,
  );
}

export function formatDateShort(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayTabLabel(dayStartMs: number, nowMs: number): string {
  const diff = dayDiff(dayStartMs, nowMs);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff === -1) return 'Kemarin';
  return WEEKDAYS[new Date(dayStartMs).getDay()]!;
}

export function relativeDayLabel(ms: number, nowMs: number): string {
  const diff = dayDiff(ms, nowMs);
  if (diff === 0) return 'Hari ini';
  if (diff === -1) return 'Kemarin';
  if (diff === 1) return 'Besok';
  if (diff < 0 && diff >= -6) return `${-diff} hari lalu`;
  return formatDateShort(ms);
}

export function relativeTime(ms: number, nowMs: number): string {
  const delta = nowMs - ms;
  if (delta < 60_000) return 'baru saja';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days} hari lalu`;
  return formatDateShort(ms);
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

export function formatCountdown(targetMs: number, nowMs: number): string {
  const totalMinutes = Math.floor((targetMs - nowMs) / 60_000);
  if (totalMinutes < 1) return 'sebentar lagi';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days} hr ${hours} j` : `${days} hr`;
  if (hours > 0) return minutes > 0 ? `${hours} j ${minutes} m` : `${hours} j`;
  return `${minutes} m`;
}

export function formatDateLong(ms: number): string {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY' -> '17 November 2026' | 'November 2026' | '2026'. */
export function formatPartialDate(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const month = match[2] ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!month) return match[1]!;
  return match[3] ? `${Number(match[3])} ${month} ${match[1]}` : `${month} ${match[1]}`;
}
