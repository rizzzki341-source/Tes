import type { WatchLink } from './anilist/types';

export type WatchSource =
  | { kind: 'youtube-playlist'; site: 'YouTube'; url: string; playlistId: string }
  | { kind: 'youtube-video'; site: 'YouTube'; url: string; videoId: string }
  | { kind: 'external'; site: string; url: string };

export const YT_ID = /^[A-Za-z0-9_-]{6,64}$/;

/** Order of the external platforms; the ones that operate in Indonesia come first. */
export const SITE_PRIORITY: readonly string[] = [
  'YouTube',
  'Bilibili TV',
  'iQ',
  'Netflix',
  'Crunchyroll',
  'Disney Plus',
  'Amazon Prime Video',
  'WeTV',
  'Viu',
  'Catchplay',
  'HIDIVE',
  'Hulu',
];

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com']);
const VIDEO_PATH = /^\/(?:embed|shorts|live|v)\/([^/?#]+)\/?$/;

export function safeHttpsUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url === '') return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Reads a video and/or playlist id out of an https YouTube URL. Channel and other pages give null. */
export function parseYoutubeUrl(url: string): { videoId?: string; playlistId?: string } | null {
  const safe = safeHttpsUrl(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  const host = parsed.hostname.toLowerCase();

  let video: string | null = null;
  if (host === 'youtu.be') {
    video = parsed.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parsed.pathname === '/watch') video = parsed.searchParams.get('v');
    else {
      const match = VIDEO_PATH.exec(parsed.pathname);
      if (match && match[1] !== 'videoseries') video = match[1]!;
      else if (parsed.pathname !== '/playlist' && !match) return null;
    }
  } else {
    return null;
  }

  const list = parsed.searchParams.get('list');
  const out: { videoId?: string; playlistId?: string } = {};
  if (video && YT_ID.test(video)) out.videoId = video;
  if (list && YT_ID.test(list)) out.playlistId = list;
  return out.videoId || out.playlistId ? out : null;
}

export function youtubeEmbedUrl(src: { videoId: string } | { playlistId: string }): string {
  return 'playlistId' in src
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(src.playlistId)}`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(src.videoId)}`;
}

export function youtubeWatchUrl(src: { videoId: string } | { playlistId: string }): string {
  return 'playlistId' in src
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(src.playlistId)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(src.videoId)}`;
}

/** In-app route of the official player for a playable source. */
export function watchPath(mediaId: number, src: { videoId: string } | { playlistId: string }): string {
  return 'playlistId' in src
    ? `/anime/${mediaId}/tonton?list=${encodeURIComponent(src.playlistId)}`
    : `/anime/${mediaId}/tonton?v=${encodeURIComponent(src.videoId)}`;
}

function rank(source: WatchSource): number {
  if (source.kind === 'youtube-playlist') return 0;
  if (source.kind === 'youtube-video') return 1;
  return 2;
}

function priority(site: string): number {
  const index = SITE_PRIORITY.findIndex((name) => name.toLowerCase() === site.toLowerCase());
  return index === -1 ? SITE_PRIORITY.length : index;
}

/** https only, de-duplicated by url, in-app playable first, then SITE_PRIORITY, then A-Z. */
export function toWatchSources(links: WatchLink[]): WatchSource[] {
  const seen = new Set<string>();
  const out: WatchSource[] = [];
  for (const link of links) {
    const url = safeHttpsUrl(link?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const yt = parseYoutubeUrl(url);
    if (yt?.playlistId) out.push({ kind: 'youtube-playlist', site: 'YouTube', url, playlistId: yt.playlistId });
    else if (yt?.videoId) out.push({ kind: 'youtube-video', site: 'YouTube', url, videoId: yt.videoId });
    else {
      const site = typeof link.site === 'string' && link.site.trim() !== '' ? link.site.trim() : new URL(url).hostname;
      out.push({ kind: 'external', site, url });
    }
  }
  return out.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      priority(a.site) - priority(b.site) ||
      a.site.localeCompare(b.site, 'id') ||
      a.url.localeCompare(b.url),
  );
}
