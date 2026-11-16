import type { Anime, TrackingData } from '../../src/lib/anilist/types';
import type { RawMedia } from '../../src/lib/anilist/mappers';
import type { LibraryEntry, Snapshot } from '../../src/store/library';

export function anime(id: number, extra: Partial<Anime> = {}): Anime {
  return {
    id,
    title: { romaji: `Anime ${id}`, english: `Show ${id}`, native: null },
    cover: `https://img.example/${id}-large.jpg`,
    coverSmall: `https://img.example/${id}-small.jpg`,
    banner: null,
    format: 'TV',
    status: 'RELEASING',
    episodes: 12,
    score: 80,
    popularity: 1000,
    genres: ['Action'],
    season: 'FALL',
    seasonYear: 2026,
    nextAiring: null,
    ...extra,
  };
}

export function snapshot(id: number, extra: Partial<Snapshot> = {}): Snapshot {
  const a = anime(id);
  return { id, title: a.title, cover: a.cover, coverSmall: a.coverSmall, format: a.format, status: a.status, episodes: a.episodes, ...extra };
}

export function entry(id: number, extra: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id,
    snapshot: snapshot(id),
    subscribed: true,
    subscribedAt: 0,
    list: null,
    watched: [],
    addedAt: 0,
    updatedAt: 0,
    ...extra,
  };
}

export function tracking(animeList: Anime[], airing: TrackingData['airing']): TrackingData {
  return { anime: animeList, airing };
}

export function rawMedia(id: number, extra: Partial<RawMedia> = {}): RawMedia {
  return {
    id,
    type: 'ANIME',
    isAdult: false,
    title: { romaji: `Anime ${id}`, english: null, native: null },
    coverImage: { large: `https://img.example/${id}-large.jpg`, medium: `https://img.example/${id}-small.jpg` },
    format: 'TV',
    status: 'RELEASING',
    episodes: 12,
    averageScore: 81,
    popularity: 500,
    genres: ['Action', 'Drama'],
    season: 'FALL',
    seasonYear: 2026,
    nextAiringEpisode: { episode: 8, airingAt: 1_800_000_000 },
    ...extra,
  };
}

/** A fetch Response stand-in with a JSON body. */
export function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}
