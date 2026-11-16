// A fixed zone without daylight saving keeps the expected labels readable (WIB, UTC+7).
process.env.TZ = 'Asia/Jakarta';

import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayDiff,
  dayTabLabel,
  formatClock,
  formatCountdown,
  formatDateLong,
  formatDateShort,
  formatPartialDate,
  nextSeasonOf,
  relativeDayLabel,
  relativeTime,
  seasonOf,
  startOfLocalDay,
} from '../../src/lib/time';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('time zone setup', () => {
  it('runs in WIB', () => {
    expect(new Date(2026, 10, 17).getTimezoneOffset()).toBe(-420);
  });
});

describe('seasonOf / nextSeasonOf', () => {
  it.each([
    [1, 'WINTER'],
    [3, 'WINTER'],
    [4, 'SPRING'],
    [6, 'SPRING'],
    [7, 'SUMMER'],
    [9, 'SUMMER'],
    [10, 'FALL'],
    [12, 'FALL'],
  ] as const)('month %i is %s', (month, season) => {
    expect(seasonOf(new Date(2026, month - 1, 15))).toEqual({ season, year: 2026 });
  });

  it('moves to the next season inside a year', () => {
    expect(nextSeasonOf(new Date(2026, 0, 1))).toEqual({ season: 'SPRING', year: 2026 });
    expect(nextSeasonOf(new Date(2026, 4, 1))).toEqual({ season: 'SUMMER', year: 2026 });
    expect(nextSeasonOf(new Date(2026, 7, 31))).toEqual({ season: 'FALL', year: 2026 });
  });

  it('rolls fall over to winter of the next year', () => {
    expect(nextSeasonOf(new Date(2026, 10, 16))).toEqual({ season: 'WINTER', year: 2027 });
    expect(nextSeasonOf(new Date(2026, 11, 31, 23, 59))).toEqual({ season: 'WINTER', year: 2027 });
  });
});

describe('startOfLocalDay / addDays', () => {
  it('snaps to local midnight', () => {
    expect(startOfLocalDay(at(2026, 11, 17, 21, 30))).toBe(at(2026, 11, 17));
    expect(startOfLocalDay(at(2026, 11, 17))).toBe(at(2026, 11, 17));
  });

  it('adds and subtracts calendar days across month and year ends', () => {
    expect(addDays(at(2026, 11, 30), 1)).toBe(at(2026, 12, 1));
    expect(addDays(at(2026, 12, 31), 1)).toBe(at(2027, 1, 1));
    expect(addDays(at(2026, 3, 1), -1)).toBe(at(2026, 2, 28));
    expect(addDays(at(2026, 11, 17), 0)).toBe(at(2026, 11, 17));
    expect(addDays(at(2026, 11, 17), 7)).toBe(at(2026, 11, 24));
  });

  it('counts calendar days between two instants', () => {
    expect(dayDiff(at(2026, 11, 17, 23, 59), at(2026, 11, 17, 0, 1))).toBe(0);
    expect(dayDiff(at(2026, 11, 18, 0, 1), at(2026, 11, 17, 23, 59))).toBe(1);
    expect(dayDiff(at(2026, 11, 10), at(2026, 11, 17))).toBe(-7);
  });
});

describe('labels', () => {
  const now = at(2026, 11, 17, 15, 0); // Tuesday

  it('dayTabLabel names today, tomorrow and then the weekday', () => {
    const today = startOfLocalDay(now);
    expect(dayTabLabel(today, now)).toBe('Hari ini');
    expect(dayTabLabel(addDays(today, 1), now)).toBe('Besok');
    expect(dayTabLabel(addDays(today, 2), now)).toBe('Kamis');
    expect(dayTabLabel(addDays(today, 3), now)).toBe('Jumat');
    expect(dayTabLabel(addDays(today, 5), now)).toBe('Minggu');
    expect(dayTabLabel(addDays(today, 6), now)).toBe('Senin');
  });

  it('relativeDayLabel goes from today to a short date', () => {
    expect(relativeDayLabel(at(2026, 11, 17, 0, 5), now)).toBe('Hari ini');
    expect(relativeDayLabel(at(2026, 11, 16, 23, 59), now)).toBe('Kemarin');
    expect(relativeDayLabel(at(2026, 11, 14, 8), now)).toBe('3 hari lalu');
    expect(relativeDayLabel(at(2026, 11, 11, 8), now)).toBe('6 hari lalu');
    expect(relativeDayLabel(at(2026, 10, 12, 8), now)).toBe('12 Okt 2026');
    expect(relativeDayLabel(at(2026, 11, 18, 8), now)).toBe('Besok');
  });

  it('relativeTime picks the largest sensible unit', () => {
    expect(relativeTime(now - 20_000, now)).toBe('baru saja');
    expect(relativeTime(now + 5 * MIN, now)).toBe('baru saja');
    expect(relativeTime(now - 5 * MIN, now)).toBe('5 menit lalu');
    expect(relativeTime(now - 59 * MIN, now)).toBe('59 menit lalu');
    expect(relativeTime(now - 2 * HOUR, now)).toBe('2 jam lalu');
    expect(relativeTime(now - 3 * DAY, now)).toBe('3 hari lalu');
    expect(relativeTime(at(2026, 8, 5, 9), now)).toBe('5 Agu 2026');
  });

  it('formatClock uses a 24 hour clock with a dot', () => {
    expect(formatClock(at(2026, 11, 17, 21, 30))).toBe('21.30');
    expect(formatClock(at(2026, 11, 17, 0, 5))).toBe('00.05');
    expect(formatClock(at(2026, 11, 17, 9, 0))).toBe('09.00');
  });

  it('formatDateLong and formatDateShort spell out Indonesian names', () => {
    expect(formatDateLong(at(2026, 11, 17, 12))).toBe('Selasa, 17 November 2026');
    expect(formatDateLong(at(2026, 5, 3))).toBe('Minggu, 3 Mei 2026');
    expect(formatDateShort(at(2026, 10, 12))).toBe('12 Okt 2026');
  });

  it('formatPartialDate handles each precision', () => {
    expect(formatPartialDate('2026-11-17')).toBe('17 November 2026');
    expect(formatPartialDate('2026-04')).toBe('April 2026');
    expect(formatPartialDate('2026')).toBe('2026');
    expect(formatPartialDate(null)).toBeNull();
    expect(formatPartialDate('soon')).toBeNull();
  });
});

describe('formatCountdown', () => {
  const now = at(2026, 11, 17, 12, 0);

  it('covers days, hours, minutes and the last minute', () => {
    expect(formatCountdown(now + 2 * DAY + 4 * HOUR + 10 * MIN, now)).toBe('2 hr 4 j');
    expect(formatCountdown(now + 2 * DAY + 20 * MIN, now)).toBe('2 hr');
    expect(formatCountdown(now + 3 * HOUR + 15 * MIN, now)).toBe('3 j 15 m');
    expect(formatCountdown(now + 3 * HOUR, now)).toBe('3 j');
    expect(formatCountdown(now + 12 * MIN + 59_000, now)).toBe('12 m');
    expect(formatCountdown(now + 59_000, now)).toBe('sebentar lagi');
  });

  it('never goes negative once the target has passed', () => {
    expect(formatCountdown(now, now)).toBe('sebentar lagi');
    expect(formatCountdown(now - 5 * HOUR, now)).toBe('sebentar lagi');
  });
});
