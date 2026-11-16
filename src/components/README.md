# Shared components

Import everything from the barrel: `import { Button, StateBlock, toast } from '../components';`
Hooks come from `'../hooks'`, data hooks from `'../lib/query'`, user data from `'../store/library'`.

## Rules for screens

- **Headings.** The shell prints the page `<h1>` (visible in the inner top bar, visually hidden on the four
  root tabs). A screen calls `useDocumentTitle('Judul')` and starts its own headings at `<h2>`.
- **Top bar actions.** Render `<TopBarActions>…IconButtons…</TopBarActions>` anywhere in the screen; they
  appear on the right of the inner top bar (nothing is shown on root tabs).
- **Page padding.** Wrap the screen in `<div className="page">` (padding + vertical gap). Rails, chip rows and
  scrollable tabs bleed to the screen edge on their own.
- **States.** `isPending` -> `<StateBlock variant="loading" shape=… />`; `isError && !data` ->
  `<StateBlock variant="error" error={error} onRetry={refetch} />`; `isError && data` ->
  `<StateBlock variant="stale" onReload={refetch} />` above the content; no items -> `variant="empty"`.
- **Lists.** `AiringRow` and `ListRow` render an `<li>`: put them in `<ul className="rows">`. Poster grids use
  `<div className="card-grid">` (or a `<ul className="card-grid">` with one `<li>` per card).
- **Remote text and links.** Never `dangerouslySetInnerHTML`. Synopsis text goes in
  `<p className="prose">{detail.description}</p>` (keeps line breaks). External URLs go through
  `ExternalLink` or `ButtonLink href` (https only, new tab, `rel="noopener noreferrer"`).
- **CSS.** Screen styles live in `src/screens/<name>.css` and use only the custom properties from
  `styles/tokens.css` and `styles/base.css` (`--size-icon`, `--size-icon-nav`, `--size-btn-sm`, `--size-thumb`,
  `--size-prose`, `--page-pad`, `--inset-*`, `--scrim`, `--ring`). No hex colours, no pixel values.
- **Utility classes.** `.page`, `.stack` (column, gap 16), `.cluster` (wrapping row, gap 8), `.card-grid`,
  `.rows`, `.chip-row` (one scrolling line of chips), `.section-title`, `.muted`, `.text-sm`, `.prose`, `.link`,
  `.visually-hidden`.
- **Icons.** `lucide-react` 1.x. Size comes from the component CSS; pass the bare element (`<Bell />`).
  Some older names are gone in this version: use `Trash` (not `Trash2`), `CircleExclamationPoint`
  (not `AlertCircle`/`CircleAlert`), `TriangleExclamationPoint` (not `AlertTriangle`). `tsc` flags a wrong name.

## AppShell

```ts
function AppShell(): JSX.Element
```

Layout route: skip link, TopBar (root variant on `/`, `/jadwal`, `/cari`, `/koleksi`; inner variant with a back
button elsewhere), `<main id="konten">`, BottomNav / SideNav, ToastHost, an error boundary and the Suspense
fallback around the routed screen. It also runs `initNative` and `useAlertsSync`. Screens never render it.

```tsx
<Route element={<AppShell />}><Route index element={<Home />} /></Route>
```

## TopBar, TopBarActions

```ts
type TopBarProps =
  | { variant: 'root'; title: string; unread?: number }
  | { variant: 'inner'; title: string; onBack: () => void; actions?: ReactNode };
function TopBar(props: TopBarProps): JSX.Element
function TopBarActions(props: { children: ReactNode }): ReactPortal | null
```

`TopBar` is rendered by AppShell. Screens only use `TopBarActions`.

```tsx
useDocumentTitle(title);
<TopBarActions><IconButton label="Bagikan" icon={<Share2 />} onClick={share} /></TopBarActions>
```

## BottomNav, SideNav

```ts
function BottomNav(): JSX.Element   // fixed bottom bar, below 900 px
function SideNav(): JSX.Element     // left rail, from 900 px
const NAV_ITEMS: readonly { to: string; label: string; icon: LucideIcon }[]
```

Rendered by AppShell: Beranda `/`, Jadwal `/jadwal`, Cari `/cari`, Koleksi `/koleksi`; the current one gets
`aria-current="page"`.

## Button, ButtonLink

```ts
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';   // default 'secondary'
type ButtonSize = 'sm' | 'md';                                        // default 'md'
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; block?: boolean;
  pressed?: boolean;   // toggle: sets aria-pressed; keep the label identical in both states
}
type ButtonLinkProps = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; block?: boolean;
  children: ReactNode; className?: string; 'aria-label'?: string }
  & ({ to: string } | { href: string });   // to = in-app route, href = external https (new tab)
```

```tsx
<Button variant="primary" icon={<Bell />} pressed={subscribed} onClick={toggle}>Langganan</Button>
<ButtonLink to="/cari" size="sm">Cari anime</ButtonLink>
```

## IconButton, IconLink

```ts
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'aria-pressed' | 'children'> {
  label: string; icon: ReactNode; pressed?: boolean;
}
interface IconLinkProps { label: string; icon: ReactNode; to: string; badge?: number; badgeLabel?: string; className?: string }
```

44 px round control; `label` becomes the accessible name.

```tsx
<IconButton label={`Langganan ${title}`} icon={<Bell />} pressed={subscribed} onClick={toggle} />
<IconLink to="/notifikasi" label="Notifikasi" icon={<Bell />} badge={3} badgeLabel="3 belum dibaca" />
```

## Chip, ChipLink, StatusChip

```ts
interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> { selected: boolean; children: ReactNode }
interface ChipLinkProps { to: string; children: ReactNode; className?: string }
interface StatusChipProps { tone?: 'neutral' | 'accent' | 'warning'; children: ReactNode; className?: string }
```

`Chip` = filter toggle (aria-pressed), `ChipLink` = link chip, `StatusChip` = static label.

```tsx
<Chip selected={onlySubscribed} onClick={() => setOnly(!onlySubscribed)}>Hanya langganan</Chip>
<ChipLink to={`/cari?genre=${encodeURIComponent(g.id)}`}>{g.label}</ChipLink>
```

## Tabs, TabPanel

```ts
interface TabItem<T extends string = string> { id: T; label: string }
interface TabsProps<T extends string = string> {
  idBase: string; label: string; items: TabItem<T>[]; value: T; onChange: (id: T) => void; scrollable?: boolean;
}
interface TabPanelProps { idBase: string; id: string; children: ReactNode; className?: string }
```

Arrow keys / Home / End move and select. Render only the panel of the selected tab, with the same `idBase`.

```tsx
<Tabs idBase="koleksi" label="Bagian koleksi" items={items} value={tab} onChange={setTab} />
<TabPanel idBase="koleksi" id={tab}>{content}</TabPanel>
```

## SelectField, TextField, Switch, RadioGroup

```ts
interface SelectFieldProps<T extends string = string> {
  label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[];
  hint?: string; error?: string; disabled?: boolean; name?: string; className?: string;
}
interface TextFieldProps {
  label: string; value: string; onChange: (value: string) => void;
  type?: 'text' | 'search' | 'url' | 'email'; placeholder?: string; name?: string;
  multiline?: boolean; rows?: number; clearable?: boolean; icon?: ReactNode;
  hint?: string; error?: string; disabled?: boolean; readOnly?: boolean; autoFocus?: boolean; maxLength?: number;
  inputMode?: …; enterKeyHint?: …; autoComplete?: string; spellCheck?: boolean; className?: string;
}
interface SwitchProps { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; className?: string }
interface RadioGroupProps<T extends string = string> {
  label: string; hint?: string; value: T; onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[]; disabled?: boolean; className?: string;
}
```

Every field has a visible label; `error` marks the control invalid and is linked with `aria-describedby`.
A select has no "empty" value of its own: use `''` for "Semua".

```tsx
<TextField label="Cari anime" type="search" value={q} onChange={setQ} clearable icon={<Search />} />
<SelectField label="Format" value={format ?? ''} onChange={setFormat} options={[{ value: '', label: 'Semua format' }, …]} />
```

## Poster

```ts
interface PosterProps {
  cover: string | null; coverSmall?: string | null; title: string;
  decorative?: boolean;                 // true when the title is printed next to it (alt="")
  size?: 'fluid' | 'thumb' | 'lg';      // default 'fluid' (fills its container)
  eager?: boolean; className?: string;
}
```

2:3 box, lazy image, title-initial fallback; uses `coverSmall` when "Hemat data" is on.

```tsx
<Poster cover={anime.cover} coverSmall={anime.coverSmall} title={title} size="lg" />
```

## AnimeCard

```ts
type CardAnime = Pick<Anime, 'id' | 'title' | 'cover' | 'coverSmall' | 'format'> & { score?: number | null };
interface AnimeCardProps {
  anime: CardAnime;          // an Anime or a library Snapshot
  badge?: string;            // "Ep 8", "Film"
  sublabel?: string;         // "2 jam lalu"
  meta?: string;             // replaces the default "Seri TV · 8,6"
  to?: string;               // default `/anime/<id>`
  layout?: 'rail' | 'grid';  // default 'grid'
  eager?: boolean;
}
function animeMeta(anime: CardAnime): string
```

One link per card; the title follows the title-language setting.

```tsx
<AnimeCard anime={item.anime} layout="rail" badge={`Ep ${item.episode}`} sublabel={relativeTime(item.airingAt * 1000, now)} />
```

## Rail

```ts
interface RailProps { title: string; seeAllTo?: string; loading?: boolean; children?: ReactNode; className?: string }
```

`<section>` with an `<h2>`, optional "Lihat semua" link and a scroll-snap list. Each child is wrapped in an
`<li>`. Renders nothing when there are no children and `loading` is false.

```tsx
<Rail title="Musim ini" seeAllTo="/cari?season=FALL&year=2026" loading={isPending}>
  {data?.season.map((a) => <AnimeCard key={a.id} anime={a} layout="rail" />)}
</Rail>
```

## FeaturedCarousel

```ts
interface FeaturedCarouselProps { items: Anime[]; label?: string }   // label default "Lagi ramai dibicarakan"
```

Banner slides with title, format, score, genres and a "Lihat detail" link. No autoplay. Null when empty.

```tsx
<FeaturedCarousel items={data.trending} />
```

## AiringRow

```ts
interface AiringRowProps {
  mediaId: number; title: TitleSet; cover: string | null; coverSmall?: string | null;
  episode: number;
  atMs: number;                          // airingAt * 1000
  nowMs: number;                         // shared clock from useNow()
  timeMode?: 'clock' | 'relative';       // default 'clock' ("21.30"); 'relative' = "2 jam lalu"
  finale?: boolean; unread?: boolean;
  subscribed?: boolean; onToggleSubscribe?: () => void;   // omit onToggleSubscribe to hide the bell
}
```

Shows "Sudah tayang" once `atMs <= nowMs`, otherwise a countdown chip. Renders an `<li>`.

```tsx
<ul className="rows">{items.map((i) => (
  <AiringRow key={i.id} mediaId={i.anime.id} title={i.anime.title} cover={i.anime.cover} coverSmall={i.anime.coverSmall}
    episode={i.episode} atMs={i.airingAt * 1000} nowMs={now} subscribed={ids.has(i.anime.id)}
    onToggleSubscribe={() => toggleSubscribe(i.anime, Date.now())} />))}</ul>
```

## ListRow

```ts
interface ListRowProps { to: string; title: string; cover: string | null; coverSmall?: string | null; secondary?: ReactNode; trailing?: ReactNode }
```

Renders an `<li>`; the whole row links to `to`, controls in `trailing` stay clickable.

```tsx
<ListRow to={`/anime/${e.id}`} title={pickTitle(e.snapshot.title)} cover={e.snapshot.cover}
  secondary="Sedang ditonton" trailing={`${e.watched.length}/${e.snapshot.episodes ?? '?'}`} />
```

## Countdown

```ts
interface CountdownProps { targetMs: number; nowMs?: number; doneLabel?: string; className?: string }   // doneLabel default "Sudah tayang"
```

`<time>` with `formatCountdown` text. Without `nowMs` it ticks every 30 s by itself.

```tsx
<Countdown targetMs={anime.nextAiring.airingAt * 1000} />
```

## EpisodeTracker

```ts
interface EpisodeTrackerProps {
  count: number;                         // episodes to list; 0 = not known yet
  watched: number[];
  onToggle: (episode: number, watched: boolean) => void;
  onMarkThrough: (episode: number) => void;   // "Tandai sampai sini" for the last tapped episode
  onClear: () => void;                        // "Hapus progres"
}
function episodeCount(anime: { episodes: number | null; nextAiring?: { episode: number } | null }, watched?: number[]): number
```

Grid of toggle buttons, a range select above 100 episodes, and the two actions.

```tsx
<EpisodeTracker count={episodeCount(detail, entry?.watched)} watched={entry?.watched ?? []}
  onToggle={(ep, on) => setWatched(detail, ep, on, Date.now())} onMarkThrough={(ep) => markWatchedThrough(detail, ep, Date.now())} onClear={() => clearProgress(detail.id, Date.now())} />
```

## SourceList

```ts
interface SourceListProps { mediaId: number; sources: WatchSource[] }
```

YouTube sources get "Putar di sini" (-> `/anime/<id>/tonton?list=…` or `?v=…`), others "Buka <site>" in a new
tab. Empty list shows "Belum ada sumber resmi yang tercatat".

```tsx
<SourceList mediaId={detail.id} sources={toWatchSources(detail.links)} />
```

## OfficialPlayer

```ts
interface OfficialPlayerProps { title: string; videoId?: string | null; playlistId?: string | null }
```

Validates the id with `YT_ID`, embeds the unmodified `youtube-nocookie.com` player in 16:9 and always shows
"Buka di YouTube". Invalid id -> empty state; offline -> a note above the frame.

```tsx
<OfficialPlayer title={title} videoId={params.get('v')} playlistId={params.get('list')} />
```

## StateBlock, SkeletonCard, errorMessage

```ts
type StateBlockProps =
  | { variant: 'loading'; shape?: 'rail' | 'grid' | 'rows' | 'detail'; label?: string }   // shape default 'rows'
  | { variant: 'empty'; title: string; body?: ReactNode; icon?: ReactNode; action?: ReactNode }
  | { variant: 'error'; error: unknown; onRetry?: () => void; retrying?: boolean }
  | { variant: 'stale'; onReload: () => void; reloading?: boolean };
function errorMessage(error: unknown): string        // copy chosen from ApiError.kind
const ERROR_COPY: Record<ApiErrorKind, string>
function SkeletonCard(): JSX.Element
```

Errors use `role="alert"`, loading uses `aria-busy`. Leave `onRetry` out for `not-found`.

```tsx
if (query.isPending) return <StateBlock variant="loading" shape="grid" />;
if (query.isError && !query.data) return <StateBlock variant="error" error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />;
```

## Toast

```ts
function toast(message: string): void
function ToastHost(): JSX.Element   // mounted once by AppShell
```

One message at a time, 4 s, announced politely.

```tsx
const on = toggleSubscribe(anime, Date.now());
toast(on ? 'Masuk langganan' : 'Langganan dihapus');
```

## ConfirmDialog

```ts
interface ConfirmDialogProps {
  open: boolean; title: string; body?: ReactNode;
  confirmLabel?: string;   // default "Ya, lanjutkan"
  cancelLabel?: string;    // default "Batal"
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;    // also Escape, backdrop click, Android back
}
```

Native `<dialog>`; set `open` to false in both callbacks. Focus returns to the trigger.

```tsx
<ConfirmDialog open={asking} danger title="Hapus semua riwayat?" confirmLabel="Ya, hapus"
  onConfirm={() => { clearHistory(); setAsking(false); }} onCancel={() => setAsking(false)} />
```

## ExternalLink

```ts
interface ExternalLinkProps { href: string; children: ReactNode; className?: string }
```

Inline https link (new tab, `rel="noopener noreferrer"`); a non-https `href` renders plain text.

```tsx
<p className="muted text-sm">Data: <ExternalLink href={detail.siteUrl}>AniList</ExternalLink></p>
```

## ErrorBoundary

```ts
interface ErrorBoundaryProps { resetKey?: string; children: ReactNode }
```

Already wraps every screen in AppShell ("Halaman ini lagi bermasalah" + "Coba lagi"). Use it again only around
an optional part of a screen that must not take the rest down.

## Hooks (`src/hooks`)

```ts
function useNow(intervalMs?: number): number                 // default 30 000; reads Date.now()
function useDocumentTitle(title: string): void               // document.title + the shell's h1
function useTitle(): (t: TitleSet) => string                 // title in the language chosen in Pengaturan
function useOnline(): boolean
function useInbox(): { items: InboxItem[]; unread: number }  // buildInbox over useTracking + the store
function useAlertsSync(): void                               // shell only
```

## Helpers outside the architecture contract

- `lib/catalog.ts`: `LIST_LABEL`, `TITLE_LANG_LABEL`, `genreLabel(id)`, `relationLabel(relation)`,
  `sourceLabel(source)`, `formatScore(score)` -> `'8,6' | null`.
- `lib/time.ts`: `dayDiff(ms, nowMs)`, `formatDateShort(ms)`, `formatPartialDate('YYYY-MM-DD' | 'YYYY-MM' | 'YYYY')`.
- `lib/sources.ts`: `safeHttpsUrl(url)`, `youtubeWatchUrl(src)`, `watchPath(mediaId, src)`, `SITE_PRIORITY`.
- `lib/anilist/queries.ts`: `resolveSort(params)`, `searchVariables(params, page)`.
- `lib/anilist/client.ts`: `isAbortError(error)`, `ANILIST_URL`.
- `lib/query.ts`: `QueryProvider`, `shouldRetry`, `retryDelay`.
- `lib/platform.ts`: `currentHashPath()`.
- `store/library.ts`: `toSnapshot(anime)`, `useEntry(mediaId)`, `nextUnwatched(entry)`, `subscribedIds(entries)`,
  `historyKey(mediaId, episode)`, `emptyLibrary()`, `DEFAULT_SETTINGS`, `STORAGE_KEY`, `HISTORY_LIMIT`.
  Every action accepts a full `Anime` where a `Snapshot` is expected and stores only the snapshot fields.
