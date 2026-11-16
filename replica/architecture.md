# Architecture: myanime (a rebuild of Wibuku's core features)

Read with `replica/recon.md` (what the original does), `replica/fixes.md` (what its users hate) and
`replica/design/` (tokens and component specs). This file is the build contract: names, types and
routes written here are what the code uses.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | Vite + React + TypeScript, one codebase | renders in a browser, so every screen can be tested and screenshotted without an emulator |
| Android | Capacitor (WebView shell) + `@capacitor/local-notifications`, `@capacitor/app`, `@capacitor/share` | small APK, no NDK, native alarms for episode alerts. Swap for Expo/Kotlin later if a native player is ever needed |
| routing | `react-router` `HashRouter` | works from `https://localhost` in the WebView and from any static host without rewrites |
| styling | plain CSS + custom properties generated from `replica/design/tokens.json` | tokens stay the single source; no raw hex or px in components |
| icons | `lucide-react` | open licence, tree-shaken |
| remote data | AniList public GraphQL API (`https://graphql.anilist.co`), no key | documented public API, CORS `*`, has airing schedule, official streaming links and trailers |
| data cache | TanStack Query, persisted to IndexedDB (`idb-keyval`) | cached screens open instantly and offline; background refresh keeps them current |
| user data | `zustand` + `persist` in `localStorage` key `myanime:v1` | no account, nothing leaves the device |
| database / auth / payments / email / jobs | none | no accounts, nothing to sell, no server. `replica-backend` is not needed for v1 |
| tests | Vitest (unit), Playwright + axe (e2e, API mocked), `npm run test:live` (real API smoke) | |
| hosting | any static host for the web build; GitHub Actions builds the debug APK | |

One request path only: the device talks to AniList. No scraping, no private endpoints, nothing from the
original's servers.

## Legal line (do not cross it in code)

- myanime never hosts, proxies, downloads or re-streams video. Playback is only (a) the official YouTube
  embedded player for trailers and for playlists that licensors publish, and (b) links that open the
  licensed platform (Bilibili TV/Bstation, Crunchyroll, Netflix, iQIYI, ...).
- The YouTube player is embedded unmodified (`youtube-nocookie.com/embed`), no overlay over its controls or ads.
- `isAdult: false` on every list query; adult entries are also dropped client-side.
- AniList: attribute the data ("Data: AniList") and respect the rate limit (currently 30 requests/minute).
  Its API terms allow free non-commercial use; commercial use needs AniList's permission.

## Data layer contract (`src/lib`)

```ts
// lib/anilist/types.ts
export type TitleSet = { romaji: string | null; english: string | null; native: string | null };
export type AnimeFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type AnimeStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
export interface Airing { episode: number; airingAt: number }            // airingAt = unix seconds
export interface Anime {
  id: number; title: TitleSet; cover: string | null; coverSmall: string | null; banner: string | null;
  format: AnimeFormat | null; status: AnimeStatus | null; episodes: number | null;
  score: number | null;            // 0-100
  popularity: number | null; genres: string[]; season: Season | null; seasonYear: number | null;
  nextAiring: Airing | null;
}
export interface AiringItem extends Airing { id: number; anime: Anime }
export interface WatchLink { site: string; url: string; language: string | null }
export interface OfficialEpisode { title: string; url: string; site: string }
export interface AnimeDetail extends Anime {
  description: string;             // plain text, tags stripped, <br> -> newline
  duration: number | null; source: string | null; studios: string[];
  startDate: string | null; endDate: string | null;      // 'YYYY-MM-DD', 'YYYY-MM' or 'YYYY'
  trailerYoutubeId: string | null;
  links: WatchLink[];              // externalLinks with type STREAMING only
  officialEpisodes: OfficialEpisode[];
  upcoming: Airing[];
  relations: { relation: string; anime: Anime }[];       // ANIME, non-adult only
  recommendations: Anime[];
  siteUrl: string;
}
export type SortKey = 'POPULARITY_DESC' | 'TRENDING_DESC' | 'SCORE_DESC' | 'START_DATE_DESC' | 'SEARCH_MATCH';
export interface SearchParams { q: string; genre: string | null; format: AnimeFormat | null;
  status: AnimeStatus | null; year: number | null; season: Season | null; sort: SortKey }
export interface PageResult<T> { items: T[]; page: number; hasNext: boolean }
export interface HomeData { trending: Anime[]; latest: AiringItem[]; season: Anime[]; upcoming: Anime[]; movies: Anime[]; top: Anime[] }
export interface TrackingData { anime: Anime[]; airing: { mediaId: number; episode: number; airingAt: number }[] }

// lib/anilist/client.ts
export type ApiErrorKind = 'network' | 'rate-limit' | 'server' | 'not-found' | 'graphql';
export class ApiError extends Error { kind: ApiErrorKind; status: number | null; retryAfterMs: number | null }
export function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T>;

// lib/anilist/queries.ts  (each is exactly one HTTP request unless noted)
export function fetchHome(nowMs: number, signal?: AbortSignal): Promise<HomeData>;
export function fetchScheduleDay(dayStartMs: number, signal?: AbortSignal): Promise<AiringItem[]>;  // follows pages (max 4)
export function searchAnime(params: SearchParams, page: number, signal?: AbortSignal): Promise<PageResult<Anime>>;
export function fetchAnime(id: number, signal?: AbortSignal): Promise<AnimeDetail>;
export function fetchTracking(ids: number[], sinceMs: number, signal?: AbortSignal): Promise<TrackingData>;
```

Query shapes verified against the live API on 2026-11-16 (home fits in one request; `Media` not found
returns HTTP 404; `description(asHtml:false)` still contains `<br>`/`<i>` and must be cleaned).

`gql` rules: POST JSON; a small in-memory limiter spaces requests (at most 1 in flight per 300 ms and
never more than 25 per rolling minute); HTTP 429 -> `rate-limit` with `retryAfterMs` from `Retry-After`
(seconds) or 60 s; 404 -> `not-found`; 5xx -> `server`; `fetch` rejection -> `network`; `errors` in a
200 body -> `graphql`. Aborts propagate as `AbortError` and are not wrapped.

```ts
// lib/query.ts — TanStack Query wiring
export const queryKeys = { home, scheduleDay(dayStartMs), search(params), anime(id), tracking(ids) };
export function createQueryClient(): QueryClient;       // retry: 2 tries for network/server, 1 retry after retryAfterMs for rate-limit (only if <= 15 s), never for not-found
export function useHome(): UseQueryResult<HomeData, ApiError>;                    // staleTime 5 min, refetchInterval 5 min
export function useScheduleDay(dayStartMs: number): UseQueryResult<AiringItem[], ApiError>;   // staleTime 5 min
export function useSearch(params: SearchParams): UseInfiniteQueryResult<InfiniteData<PageResult<Anime>>, ApiError>; // staleTime 10 min
export function useAnime(id: number): UseQueryResult<AnimeDetail, ApiError>;      // staleTime 10 min
export function useTracking(): UseQueryResult<TrackingData, ApiError>;            // subscribed ids from the store; since = now - 30 d; enabled only when there are ids; staleTime 2 min
```

Defaults: `gcTime` 7 days, `refetchOnWindowFocus` and `refetchOnReconnect` on, `networkMode: 'offlineFirst'`.
Successful queries are persisted (max age 7 days, cache buster = app version) so a cold start paints from cache
and refreshes behind it. "Anime always up to date" means exactly this: every list is read live from the
schedule, nobody uploads anything by hand.

```ts
// lib/time.ts — pure, every function takes the clock as an argument
export function seasonOf(d: Date): { season: Season; year: number };
export function nextSeasonOf(d: Date): { season: Season; year: number };
export function startOfLocalDay(ms: number): number;
export function addDays(dayStartMs: number, n: number): number;     // DST-safe (calendar days, not 24 h)
export function dayTabLabel(dayStartMs: number, nowMs: number): string;   // 'Hari ini' | 'Besok' | 'Rabu' ...
export function relativeDayLabel(ms: number, nowMs: number): string;      // 'Hari ini' | 'Kemarin' | '3 hari lalu' | '12 Okt 2026'
export function relativeTime(ms: number, nowMs: number): string;          // 'baru saja' | '5 menit lalu' | '2 jam lalu' | '3 hari lalu'
export function formatClock(ms: number): string;                          // '21.30' (id-ID, 24 h)
export function formatCountdown(targetMs: number, nowMs: number): string; // '2 hr 4 j' | '3 j 15 m' | '12 m' | 'sebentar lagi'
export function formatDateLong(ms: number): string;                       // 'Selasa, 17 November 2026'

// lib/sources.ts
export type WatchSource =
  | { kind: 'youtube-playlist'; site: 'YouTube'; url: string; playlistId: string }
  | { kind: 'youtube-video'; site: 'YouTube'; url: string; videoId: string }
  | { kind: 'external'; site: string; url: string };
export function toWatchSources(links: WatchLink[]): WatchSource[];   // https only, de-duplicated by url, in-app playable first, then SITE_PRIORITY, then A-Z
export function youtubeEmbedUrl(src: { videoId: string } | { playlistId: string }): string;  // https://www.youtube-nocookie.com/embed/...
export function parseYoutubeUrl(url: string): { videoId?: string; playlistId?: string } | null;
export const YT_ID = /^[A-Za-z0-9_-]{6,64}$/;

// lib/notifications.ts
export interface PlannedAlert { id: number; mediaId: number; episode: number; atMs: number; title: string; body: string; finale: boolean }
export interface InboxItem { key: string; mediaId: number; episode: number; atMs: number; finale: boolean; title: TitleSet; cover: string | null }
export function alertId(mediaId: number, episode: number): number;   // stable positive 31-bit int
export function planAlerts(entries: LibraryEntry[], tracking: TrackingData, nowMs: number, titleLang: TitleLang, max?: number): PlannedAlert[]; // future airings of subscribed titles, soonest first, default max 60
export function diffAlerts(desired: PlannedAlert[], pendingIds: number[]): { cancel: number[]; schedule: PlannedAlert[] };
export function buildInbox(entries: LibraryEntry[], tracking: TrackingData, nowMs: number): InboxItem[]; // aired after subscribedAt, last 30 days, newest first
export async function syncNativeAlerts(desired: PlannedAlert[]): Promise<'unsupported' | 'denied' | 'synced'>;  // Capacitor only
export async function ensureAlertPermission(): Promise<'unsupported' | 'granted' | 'denied'>;

// lib/platform.ts
export function isNative(): boolean;
export async function shareLink(data: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'failed'>;
export async function copyText(text: string): Promise<boolean>;

// lib/backup.ts
export function exportBackup(state: PersistedLibrary, nowMs: number): string;      // JSON, { app: 'myanime', version: 1, exportedAt, data }
export function parseBackup(text: string): { ok: true; data: PersistedLibrary } | { ok: false; reason: string };  // strict validation, never throws

// lib/catalog.ts — static labels (Indonesian)
export const GENRES: { id: string; label: string }[];      // AniList genre ids, without Hentai and Ecchi
export const FORMAT_LABEL: Record<AnimeFormat, string>;    // TV 'Seri TV', MOVIE 'Film', ...
export const STATUS_LABEL: Record<AnimeStatus, string>;    // RELEASING 'Sedang tayang', FINISHED 'Tamat', NOT_YET_RELEASED 'Belum tayang', ...
export const SORT_LABEL: Record<SortKey, string>;
export const SEASON_LABEL: Record<Season, string>;         // WINTER 'Musim dingin', ...
export function pickTitle(t: TitleSet, lang: TitleLang): string;   // falls back romaji -> english -> native -> 'Tanpa judul'
```

## User data (`src/store/library.ts`)

```ts
export type TitleLang = 'romaji' | 'english' | 'native';
export type ListStatus = 'plan' | 'watching' | 'done';
export type Snapshot = Pick<Anime, 'id' | 'title' | 'cover' | 'coverSmall' | 'format' | 'status' | 'episodes'>;
export interface LibraryEntry { id: number; snapshot: Snapshot; subscribed: boolean; subscribedAt: number | null;
  list: ListStatus | null; watched: number[]; addedAt: number; updatedAt: number }
export interface HistoryItem { key: string; mediaId: number; episode: number; at: number }   // key = `${mediaId}:${episode}`
export interface Settings { titleLang: TitleLang; alerts: boolean; dataSaver: boolean }
export interface PersistedLibrary { entries: Record<string, LibraryEntry>; history: HistoryItem[]; settings: Settings; inboxReadAt: number }
export const useLibrary: UseBoundStore<...>;   // PersistedLibrary + actions below
// actions (all take nowMs last so tests control the clock)
toggleSubscribe(anime: Snapshot, nowMs): boolean          // returns the new state
setList(anime: Snapshot, status: ListStatus | null, nowMs): void
setWatched(anime: Snapshot, episode: number, watched: boolean, nowMs): void   // adds/removes a history item; first watched episode sets list 'watching' if list is null or 'plan'; watching the last known episode sets 'done'
markWatchedThrough(anime: Snapshot, episode: number, nowMs): void             // marks 1..episode
clearProgress(mediaId: number, nowMs): void
removeHistory(key: string): void;  clearHistory(): void
updateSettings(patch: Partial<Settings>): void
markInboxRead(nowMs): void
replaceAll(data: PersistedLibrary): void;  resetAll(): void
refreshSnapshot(anime: Snapshot): void    // keeps cached title/cover/status current when fresh data arrives
// entries with no subscription, no list and no watched episodes are deleted. history is capped at 500 items, newest first.
```

## Screens and routes

Bottom navigation (side rail from 900 px): **Beranda** `/`, **Jadwal** `/jadwal`, **Cari** `/cari`, **Koleksi** `/koleksi`.
Top bar: wordmark, **Notifikasi** (bell, unread count) -> `/notifikasi`, **Pengaturan** -> `/pengaturan`.
Every screen has loading (skeletons), empty, error-with-retry and "showing saved data" states. All copy is
Indonesian, written fresh in the voice of `replica/brand.md` (santai, jelas, jujur).

| ID | route | screen | content |
| --- | --- | --- | --- |
| C01 | `/` | Beranda | "Lanjut nonton" rail (library titles in progress, shows next unwatched episode) · featured carousel (trending, banner) · genre chips -> `/cari?genre=` · rails "Episode terbaru" (latest airings, badge `Ep N` + relative time), "Musim ini", "Segera tayang", "Film", "Skor tertinggi", each with "Lihat semua" -> `/cari?...` |
| C02 | `/jadwal` | Jadwal tayang | 7 day tabs from today · rows: clock time, poster, title, `Episode N`, state "Sudah tayang" or live countdown, subscribe toggle · filter "Hanya langganan" · time zone note |
| C03 | `/cari` | Cari | search box (debounce 400 ms) + selects Genre, Format, Status, Tahun, Urutkan; state lives in the URL query (`q, genre, format, status, year, season, sort`) · poster grid, loads more on scroll with a "Muat lagi" button fallback |
| C04 | `/anime/:id` | Detail | banner/poster, titles, format · year · episodes · duration, score, status · next-episode countdown · actions Langganan (toggle), Daftar (Ingin ditonton / Sedang ditonton / Selesai / hapus), Bagikan · "Tonton resmi" sources (in-app for YouTube, external otherwise) · trailer · synopsis (clamp + expand, "Terjemahkan" link) · genres · episode tracker (toggle per episode, ranges of 100, "Tandai sampai sini") · official episode links · relations · recommendations · facts · "Data: AniList" |
| C05 | `/anime/:id/tonton` | Pemutar resmi | query `v=<videoId>` or `list=<playlistId>` (validated with `YT_ID`), 16:9 official embed, "Buka di YouTube", quick "tandai episode sudah ditonton" |
| C06 | `/koleksi` | Koleksi | tabs `?tab=langganan|daftar|riwayat` · subscriptions grid with next episode · list filtered by status with progress `12/24` · history grouped by relative day with remove and "Hapus riwayat" · totals line |
| C07 | `/notifikasi` | Notifikasi | inbox from `buildInbox` (episode aired / finale), unread dots, "Tandai semua dibaca" · "Akan datang" (next planned alerts) · permission prompt on Android |
| C08 | `/pengaturan` | Pengaturan | title language · episode alerts switch · data saver · backup: copy / share / restore from pasted text · delete history / all data · about, sources and the legal note |
| C09 | `*` | Tidak ditemukan | link home |

Mapping to the original's screens is in `replica/recon.md`.

## The parts that bite

- **Rate limit (30/min).** One request for the whole home screen, one per schedule day, one per search page,
  one per detail, one for all subscriptions. Limiter + cache + 400 ms debounce. On 429 show cached data and a
  countdown-free "coba lagi" message; never loop.
- **Time zones and DST.** The API speaks unix seconds; day boundaries and labels are computed in the device's
  zone with calendar arithmetic (`addDays`), never by adding 86 400 000.
- **Alerts without a server.** Future air times for subscribed titles are scheduled as local notifications each
  time tracking data refreshes (`planAlerts` -> `diffAlerts` -> native). The season's schedule is known weeks
  ahead, so alerts keep firing while the app stays closed; a title announced after the last sync is picked up
  on the next open. Finale = the episode whose number equals `episodes`.
- **Idempotency.** `alertId` is derived from media id and episode, so re-syncing never duplicates an alert.
- **Stale/removed entries.** Snapshots keep the library readable offline and when the API fails.
- **Embedding.** YouTube refuses embeds without an http(s) referrer: keep Capacitor's `https` scheme and
  `referrerPolicy="strict-origin-when-cross-origin"`. Some owners disable embedding: always show "Buka di YouTube".
- **Untrusted remote text.** Descriptions are rendered as text nodes, never `dangerouslySetInnerHTML`. Only
  `https:` links from the API are rendered, with `rel="noopener noreferrer"`.
- **Storage limits.** Query cache in IndexedDB; user data is a few kB in `localStorage`; history capped.

## Build order

1. Foundation: tooling, tokens -> CSS, `lib/*`, store, app shell, shared components, unit tests.
2. Vertical slice: Beranda -> Detail -> subscribe -> Koleksi.
3. Must-haves: Jadwal, Cari, episode tracker + history, Notifikasi.
4. Should/could: official player, Pengaturan with backup, data saver.
5. Fixes from `replica/fixes.md` are part of 1-4 (no login, no ads, cached start, error states, alerts at air time).
6. Android shell (Capacitor), icons, debug APK.
