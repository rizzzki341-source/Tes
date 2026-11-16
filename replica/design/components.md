# Components: myanime

Dark interface, one accent, system font. Every value comes from `tokens.json` through CSS custom properties
(`--color-*`, `--space-*`, `--radius-*`, `--type-*`, `--shadow-*`, `--motion-*`, `--layout-*`). No raw hex or
pixel values in component CSS. Icons: `lucide-react`, 20 px in buttons, 24 px in navigation, always
`aria-hidden` next to a text label or inside a control that has an `aria-label`.

Global rules: minimum tap target `--layout-tap` (44 px); `:focus-visible` shows a 2 px `accent` ring with 2 px
offset; `prefers-reduced-motion` removes transitions and smooth scrolling; text never sits on an image
without a `bg` gradient or solid plate behind it; lists use real `ul/li`, controls are real `button`/`a`/`select`/`input`.

```
AppShell
  parts     skip link "Lewati ke konten", TopBar, <main id="konten">, BottomNav (< 900 px) or SideNav (>= 900 px)
  layout    content max --layout-content-max, centred; main padded so nothing hides under the fixed bars
  a11y      nav has aria-label "Navigasi utama"; current route gets aria-current="page"
  used on   all

TopBar
  variants  root (wordmark + Notifikasi + Pengaturan), inner (back button + title + optional actions)
  states    unread badge on the bell (number, max "9+"), badge has visually hidden text "N belum dibaca"
  tokens    bg bg, border-bottom border, height topbar, title type lg
  used on   all

BottomNav / SideNav
  items     Beranda, Jadwal, Cari, Koleksi (icon + label always visible)
  states    default text-muted, current accent + aria-current, focus-visible
  tokens    bg surface, border-top border, height bottom-nav; side nav width side-nav
  used on   all

Button
  variants  primary (bg accent, text on-accent), secondary (bg surface-2, text), ghost (transparent, text), danger (text danger, border danger)
  sizes     sm 36 px, md 44 px
  states    default, hover, active, focus-visible, disabled (opacity, not-allowed), pressed (aria-pressed, used by toggles such as Langganan)
  tokens    radius md, type sm/600, gap space-2
  a11y      real <button>; toggle buttons keep the same label and switch aria-pressed

IconButton
  sizes     44 px square, radius pill
  a11y      aria-label required
  used on   TopBar, cards, rows

Chip / ChipLink
  variants  filter (button, aria-pressed), link (anchor to /cari?genre=...), status (static: neutral, accent, warning)
  tokens    bg surface-2, text, radius pill, type xs; selected: bg accent, text on-accent
  used on   C01 genres, C02, C04, C06

Tabs
  behaviour role tablist/tab/tabpanel, arrow keys move, selected tab has an accent underline
  used on   C02 days (scrollable), C06 sections

SelectField / TextField / Switch / RadioGroup
  parts     visible <label>, native control, optional hint
  tokens    bg surface, border border-input, radius md, height tap, text; focus ring accent
  states    default, focus, disabled, invalid (danger border + message with aria-describedby)
  used on   C03 filters and search, C08

Poster
  behaviour <img loading="lazy" decoding="async"> in a 2:3 box, surface-2 placeholder, falls back to a title initial tile when src is missing or fails; alt is the anime title (empty when the title is printed next to it)
  data saver  uses coverSmall when Settings.dataSaver is on
  used on   cards, rows, detail

AnimeCard
  parts     Poster, title (2 lines, clamp), meta line (format · score), optional corner badge (e.g. "Ep 8", "Film") and sublabel (e.g. "2 jam lalu")
  layout    width poster (132) in rails, fluid in grids (min 132)
  a11y      one link per card; accessible name = title + badge + sublabel
  states    default, hover (lift), focus-visible
  used on   C01, C03, C04, C06

Rail
  parts     h2 heading, optional "Lihat semua" link, horizontally scrollable list with scroll-snap
  states    loading (6 skeleton cards), filled; empty rails are not rendered
  a11y      section with aria-labelledby; list is keyboard scrollable through its links
  used on   C01, C04

FeaturedCarousel
  parts     banner image with gradient plate, title, genres, score, "Lihat detail" button
  behaviour scroll-snap, one slide per viewport on mobile, no autoplay
  used on   C01

AiringRow
  parts     time column (clock, or relative time), Poster thumb, title, "Episode N", StatusChip or Countdown, subscribe IconButton (aria-pressed)
  used on   C02, C07

ListRow
  parts     Poster thumb, title, secondary line, trailing slot (progress "12/24", remove button)
  used on   C06

Countdown
  behaviour re-renders every 30 s (every second under 1 minute is not needed), text from formatCountdown, wraps in <time dateTime>
  used on   C02, C04

EpisodeTracker
  parts     range select when more than 100 episodes, grid of episode toggle buttons (aria-pressed, label "Episode N, sudah ditonton" / "belum ditonton"), actions "Tandai sampai sini" (marks 1..N of the last tapped), "Hapus progres"
  states    none known yet (message), partial, complete
  used on   C04

SourceList
  parts     list of official sources: in-app ones get a primary "Putar di sini" link, external ones a secondary link "Buka <site>" with an external-link icon and rel="noopener noreferrer" target="_blank"
  states    empty: "Belum ada sumber resmi yang tercatat" + short explanation
  used on   C04

OfficialPlayer
  parts     16:9 iframe (title = "Pemutar YouTube resmi: <judul>"), "Buka di YouTube" link
  states    invalid id (empty state), offline note
  used on   C05

StateBlock
  variants  loading (skeleton shapes for rails, grids, rows, detail), empty (icon, title, body, optional action), error (message chosen from ApiError.kind + "Coba lagi" button), stale banner ("Menampilkan data tersimpan" + "Muat ulang")
  a11y      errors use role="alert"; loading regions use aria-busy
  used on   all

Toast
  behaviour one message at a time, 4 s, role="status" aria-live="polite", bottom above the nav
  used on   subscribe, list changes, backup, share

ConfirmDialog
  behaviour native <dialog> with showModal, focus returns to the trigger, Escape cancels
  used on   C06 clear history, C08 delete all, restore backup
```

Error copy by kind: `network` "Tidak ada koneksi. Yang tersimpan tetap bisa dibuka.", `rate-limit` "Server data
lagi ramai. Coba lagi sebentar lagi.", `server` "Sumber data sedang bermasalah.", `not-found` "Anime ini tidak
ditemukan.", `graphql` "Datanya tidak terbaca.".
