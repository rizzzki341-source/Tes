// New York switches clocks on 2026-03-08 (23 hour day) and 2026-11-01 (25 hour day).
process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';
import { addDays, dayDiff, dayTabLabel, relativeDayLabel, startOfLocalDay } from '../../src/lib/time';

const HOUR = 3_600_000;
const midnight = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

describe('calendar arithmetic across daylight saving changes', () => {
  it('runs in a zone that has daylight saving', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(300);
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(240);
  });

  it('addDays lands on local midnight after a 23 hour day', () => {
    const before = midnight(2026, 3, 8);
    const after = addDays(before, 1);
    expect(after).toBe(midnight(2026, 3, 9));
    expect(after - before).toBe(23 * HOUR);
  });

  it('addDays lands on local midnight after a 25 hour day', () => {
    const before = midnight(2026, 11, 1);
    const after = addDays(before, 1);
    expect(after).toBe(midnight(2026, 11, 2));
    expect(after - before).toBe(25 * HOUR);
  });

  it('a week of day tabs stays on midnights through the change', () => {
    const start = midnight(2026, 3, 5);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    expect(days.map((ms) => new Date(ms).getHours())).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(days.map((ms) => new Date(ms).getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(addDays(start, 7) - start).toBe(7 * 24 * HOUR - HOUR);
  });

  it('going backwards is calendar based too', () => {
    expect(addDays(midnight(2026, 3, 9), -1)).toBe(midnight(2026, 3, 8));
    expect(addDays(midnight(2026, 11, 2), -1)).toBe(midnight(2026, 11, 1));
  });

  it('labels count calendar days, not 24 hour blocks', () => {
    const now = new Date(2026, 2, 8, 23, 30).getTime();
    const tomorrow = addDays(startOfLocalDay(now), 1);
    // Only 30 minutes away, yet it is the next calendar day.
    expect(dayDiff(tomorrow, now)).toBe(1);
    expect(dayTabLabel(tomorrow, now)).toBe('Besok');
    expect(relativeDayLabel(new Date(2026, 2, 7, 23, 59).getTime(), now)).toBe('Kemarin');
    expect(startOfLocalDay(now)).toBe(midnight(2026, 3, 8));
  });
});
