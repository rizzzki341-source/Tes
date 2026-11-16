export interface LimiterOptions {
  /** Minimum time between two request starts. */
  minGapMs: number;
  /** Most request starts allowed inside any rolling window. */
  maxPerWindow: number;
  windowMs: number;
}

export interface Limiter {
  /** Runs `task` once a slot is free. Rejects with an AbortError if `signal` aborts while waiting. */
  schedule<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T>;
  /** Forgets every reserved slot (tests). */
  reset(): void;
}

export function abortError(): Error {
  if (typeof DOMException === 'function') return new DOMException('The operation was aborted.', 'AbortError');
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

export function createLimiter({ minGapMs, maxPerWindow, windowMs }: LimiterOptions): Limiter {
  // Reserved start times, ascending. Slots are handed out up front so callers queue in order.
  let starts: number[] = [];

  function reserve(): number {
    const now = Date.now();
    const last = starts[starts.length - 1];
    let at = last === undefined ? now : Math.max(now, last + minGapMs);
    starts = starts.filter((t) => t > at - windowMs);
    if (starts.length >= maxPerWindow) {
      at = Math.max(at, starts[starts.length - maxPerWindow]! + windowMs);
      starts = starts.filter((t) => t > at - windowMs);
    }
    starts.push(at);
    return at;
  }

  function wait(at: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const release = () => {
        const index = starts.lastIndexOf(at);
        if (index !== -1) starts.splice(index, 1);
      };
      if (signal?.aborted) {
        release();
        reject(abortError());
        return;
      }
      const delay = at - Date.now();
      if (delay <= 0) {
        resolve();
        return;
      }
      const onAbort = () => {
        clearTimeout(timer);
        release();
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, delay);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  return {
    async schedule(task, signal) {
      await wait(reserve(), signal);
      return task();
    },
    reset() {
      starts = [];
    },
  };
}

/** AniList allows 30 requests/minute; staying at 25 leaves room for clock skew. */
export const apiLimiter = createLimiter({ minGapMs: 300, maxPerWindow: 25, windowMs: 60_000 });
