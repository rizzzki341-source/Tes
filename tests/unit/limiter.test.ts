import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLimiter } from '../../src/lib/anilist/limiter';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-17T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Schedules `count` tasks and returns the times (ms since start) at which each one started. */
function startTimes(limiter: ReturnType<typeof createLimiter>, count: number): number[] {
  const origin = Date.now();
  const starts: number[] = [];
  for (let i = 0; i < count; i += 1) {
    void limiter.schedule(async () => {
      starts.push(Date.now() - origin);
    });
  }
  return starts;
}

describe('createLimiter', () => {
  it('runs the first task without waiting', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
    const task = vi.fn(async () => 'ok');
    const result = limiter.schedule(task);
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toBe('ok');
  });

  it('spaces starts by the minimum gap, in order', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
    const starts = startTimes(limiter, 4);
    await vi.advanceTimersByTimeAsync(299);
    expect(starts).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    expect(starts).toEqual([0, 300]);
    await vi.advanceTimersByTimeAsync(600);
    expect(starts).toEqual([0, 300, 600, 900]);
  });

  it('does not wait when enough time already passed', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
    const starts = startTimes(limiter, 1);
    await vi.advanceTimersByTimeAsync(1000);
    const origin = Date.now();
    let second = -1;
    void limiter.schedule(async () => {
      second = Date.now() - origin;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(starts).toEqual([0]);
    expect(second).toBe(0);
  });

  it('never starts more than the maximum inside a rolling window', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
    const starts = startTimes(limiter, 30);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(starts).toHaveLength(25);
    expect(starts[24]).toBe(24 * 300);
    await vi.advanceTimersByTimeAsync(1);
    expect(starts).toHaveLength(26);
    expect(starts[25]).toBe(60_000);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(starts).toHaveLength(30);
    for (let i = 25; i < starts.length; i += 1) {
      expect(starts[i]! - starts[i - 25]!).toBeGreaterThanOrEqual(60_000);
    }
  });

  it('passes results and rejections through', async () => {
    const limiter = createLimiter({ minGapMs: 100, maxPerWindow: 5, windowMs: 1000 });
    const ok = limiter.schedule(async () => 42);
    const bad = limiter.schedule(async () => {
      throw new Error('boom');
    });
    const settled = Promise.allSettled([ok, bad]);
    await vi.advanceTimersByTimeAsync(100);
    const [first, second] = await settled;
    expect(first).toEqual({ status: 'fulfilled', value: 42 });
    expect(second.status).toBe('rejected');
    // A failed task still lets the queue continue.
    const next = limiter.schedule(async () => 'next');
    await vi.advanceTimersByTimeAsync(100);
    await expect(next).resolves.toBe('next');
  });

  it('rejects with AbortError when aborted while waiting and frees the slot', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 2, windowMs: 60_000 });
    const controller = new AbortController();
    const first = vi.fn(async () => 1);
    const second = vi.fn(async () => 2);
    const third = vi.fn(async () => 3);

    void limiter.schedule(first);
    const waiting = limiter.schedule(second, controller.signal);
    const outcome = waiting.then(
      () => 'resolved',
      (error: Error) => error.name,
    );
    controller.abort();
    await expect(outcome).resolves.toBe('AbortError');
    expect(second).not.toHaveBeenCalled();

    // With the aborted slot released, the window (max 2) still has room for one more.
    void limiter.schedule(third);
    await vi.advanceTimersByTimeAsync(300);
    expect(third).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately for a signal that is already aborted', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
    const task = vi.fn(async () => 1);
    await expect(limiter.schedule(task, AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
    expect(task).not.toHaveBeenCalled();
  });

  it('reset forgets earlier starts', async () => {
    const limiter = createLimiter({ minGapMs: 300, maxPerWindow: 1, windowMs: 60_000 });
    startTimes(limiter, 1);
    await vi.advanceTimersByTimeAsync(0);
    limiter.reset();
    const starts = startTimes(limiter, 1);
    await vi.advanceTimersByTimeAsync(0);
    expect(starts).toEqual([0]);
  });
});
