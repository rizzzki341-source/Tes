import { YT_ID } from '../lib/sources';

export type WatchTarget = { videoId: string } | { playlistId: string };

/**
 * Reads `?v=` / `?list=` of the player route. Every id that is present must pass `YT_ID`;
 * a playlist wins over a video. Null = nothing playable, so no embed URL is ever built from it.
 */
export function parseWatchTarget(params: URLSearchParams): WatchTarget | null {
  const video = params.get('v');
  const list = params.get('list');
  if (video !== null && !YT_ID.test(video)) return null;
  if (list !== null && !YT_ID.test(list)) return null;
  if (list !== null) return { playlistId: list };
  if (video !== null) return { videoId: video };
  return null;
}

export function isTrailer(params: URLSearchParams): boolean {
  return params.get('t') === 'trailer';
}

/** The episode the quick tracker starts on: the first unwatched one, or the last when all are watched. */
export function defaultEpisode(count: number, watched: readonly number[]): number {
  if (count <= 0) return 0;
  const seen = new Set(watched);
  for (let episode = 1; episode <= count; episode += 1) {
    if (!seen.has(episode)) return episode;
  }
  return count;
}
