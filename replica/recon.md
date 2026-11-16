# Recon map: Wibuku - Nonton Anime (Android)

Scope: the anime slice only. Find a title (new updates, schedule, search), open it, watch, follow it, get told
when the next episode is out, pick up where you stopped. Not the social layer, not the shop.
For: Indonesian anime viewers; the owner's own app, published under the name "myanime".
Date: 2026-11-16

## Sources

Public pages only. No account was used, the APK was not installed or decompiled, no network traffic was read.

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Google Play listing | https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID | pitch, feature list, 8 app screenshots, "Berisi iklan", "Pembelian dalam aplikasi", 5 jt+ downloads, updated 10 Nov 2026. The page showed both 4,7 and 4,3 as the rating |
| 2 | Google Play reviews | same listing, "Lihat semua ulasan" | 320 reviews read on 2026-11-16 (dated 2026-08-18 to 2026-11-14), see `reviews.csv` |
| 3 | Marketing site | https://wibuku.com/ | pitch ("Koleksi Super Lengkap", "Sub Indo Berkualitas", "Streaming Lancar", "Gratis Selamanya") and Premium benefits ("Tanpa Iklan", "Kualitas HD+", "Akses Prioritas", "Server Tercepat") |
| 4 | Landing page | https://www.wibuku.app/ | links to the store listing and a game top-up shop |
| 5 | Uptodown listing | https://wibuku.id.uptodown.com/android | editorial description, version 1.4.7, Android 7.1+, 5 user comments |
| 6 | Third-party review | https://emka.web.id/2025/10/review-aplikasi-wibuku-alternatif-nonton-anime-gratis-untuk-para-wibu-indonesia.html | mentions drama titles, comments under episodes, adaptive quality, premium |
| 7 | News article | https://duniaku.idntimes.com/anime-manga/anime-lain/wibuku-ilegal-ini-situs-nonton-anime-sub-indo-terbaru-lengkap-v3z02-00-b8vrp-zf4p76 | 2026-10-24: describes the service as illegal/unofficial ("statusnya tidak resmi sehingga bisa saja diblokir sewaktu-waktu") and lists licensed alternatives: Vidio, Crunchyroll, Netflix, YouTube (Muse Indonesia, Ani-One Indonesia, POPS Anime), Bstation, Prime Video |

No help centre, no public API docs, no changelog beyond "bug fixes and ui improvement". Reference screenshots
are in `replica/screens/` (git-ignored, never shipped).

## Core loop

Open the app, tap a newly updated episode (or a subscribed title), watch it, come back when the next one is out.

## Screens

Seen = in the store screenshots. Inferred = named in the listing or reviews but not pictured.

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | launch | start watching fast | top bar (key balance, profile + level, bell), premium banner, featured banner, search field, genre chips, "New Update Anime" rail (score + "New" badge), bottom nav: home, schedule, history, subscriptions | filled |
| S02 | Search | search field on S01 | find a title | query field, result count, sort dropdown ("Relevant"), rows: poster with score and episode count, title, views, synopsis snippet | filled |
| S03 | Episode / player | tap a card or row | watch and switch episode | player (previous, -10 s, pause, +10 s, quality "480p", speed "1x", fullscreen), title, episode, views, episode chips, like/dislike, Download, Share, Report, synopsis, comments (Top / Terbaru) | filled |
| S04 | Comment replies | reply on S03 | discuss | bottom sheet, reply list, input | filled |
| S05 | Profile | avatar on S01 | account and stats | avatar, name, rank, level, id, minutes watched, comments, months joined, tabs All / Comments / History, logout | filled |
| S06 | Subscribed anime | bottom nav | followed titles | poster grid with score, episode count, views | filled |
| S07 | History | bottom nav | resume | groups by relative day, per title episode rows with last position | filled |
| S08 | Schedule | bottom nav | what airs today | day heading with count, rows: poster, score, title, episode, views, date/time, badge "New Update" or "Menunggu Update" | filled |
| S09 | Start gate and login | launch | session | "memperbarui token keamanan", login, one device per account | inferred from reviews (blocking and error states) |
| S10 | Notifications | bell | new episode alerts | list | inferred |
| S11 | Premium purchase | banner on S01 | remove ads | price from Rp 12.000, QR payment | inferred |
| S12 | Social (global chat, friends, clans, gifts, pets, fishing) | menus | community | - | inferred from reviews |

Empty, loading and error states of the original were not observable from public sources; the clone specifies its own.

## Flows

```
F01 Watch the newest episode
    S01 -> S03
    happy path clicks: 2 (reviews add: an ad or a "key" per episode)
    edge: video error, missing episode, start gate fails
F02 Find a title
    S01 -> S02 -> S03
    happy path clicks: 3 + typing
    edge: title not in the catalogue, no results
F03 Follow a series
    S03 (subscribe) -> S06 ; alert -> S03
    edge: alert late or missing, finale alert late
F04 See what airs today
    S08 -> S03
    edge: "Menunggu Update" (aired in Japan, not yet uploaded)
F05 Resume
    S07 -> S03
    edge: history lost after an account reset
F06 Talk about an episode (comments, likes)          out of scope
F07 Buy premium                                        out of scope
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Bottom navigation | 4 icons | default, current | S01, S06, S07, S08 |
| Poster card | rail, grid | with score, with "New", with episode count | S01, S06 |
| Result row | poster + text | default | S02, S08 |
| Genre chip | - | default | S01 |
| Featured banner | carousel | default | S01 |
| Search field | - | empty, typed | S01, S02 |
| Player | - | playing, paused | S03 |
| Episode chip | number | current, locked (key) | S03 |
| Status badge | "New Update", "Menunggu Update" | - | S08 |
| History row | progress bar | - | S05, S07 |
| Comment | top level, reply | - | S03, S04 |

## Inferred data model

```
Anime        id, title, poster, banner, synopsis, score, genres, episode_count, views, status
             evidence: S01, S02, S06, S08              confidence: high
Episode      id, anime_id, number, video sources per quality, views, likes, uploaded_at
             evidence: S03                             confidence: high
ScheduleSlot anime_id, episode, air time, state (new update | waiting)
             evidence: S08                             confidence: high
Subscription user_id, anime_id, created_at
             evidence: S06, listing "Notifikasi ketika anime update"   confidence: high
HistoryEntry user_id, episode_id, position_seconds, watched_at
             evidence: S05, S07                        confidence: high
User         id, name, avatar, level, exp, keys, premium_until, device   confidence: medium (reviews)
Comment      id, episode_id, user_id, parent_id, body, likes            confidence: medium
Notification user_id, anime_id, episode, sent_at                        confidence: guess
```

Relationships: Anime 1-n Episode, Anime 1-n ScheduleSlot, User n-n Anime (Subscription), User 1-n HistoryEntry, Episode 1-n Comment.

## Feature matrix

See `features.csv`. Counted from the original: must 10, should 7, could 5. Skipped: 12. Added as fixes: 12.

## Out of scope (cannot or should not be cloned)

- **The video catalogue.** The original streams episodes it has no licence for (source 7). Licensed content is
  not a feature; rebuilding the same thing would mean redistributing other people's work. myanime keeps the
  job (know what is out, open it) and sends playback to official sources: the YouTube embedded player for
  trailers and licensor playlists, and links to licensed platforms. Downloads, the self-hosted player controls
  and blanket Indonesian subtitles go with it.
- The community: comments, likes, global chat, friends, clans, gifts. That is the original's network and its moderation.
- Levels, EXP, keys, pets, the fishing game, premium and ads.
- The Asian drama titles, the top-up shop.
- Accounts on the original's servers. The clone keeps data on the device and offers a backup instead.

## Mapping to the clone

S01 -> C01 Beranda · S02 -> C03 Cari · S03 -> C04 Detail + C05 Pemutar resmi · S06, S07 -> C06 Koleksi ·
S08 -> C02 Jadwal · S10 -> C07 Notifikasi · S05 (the useful part) -> C06 totals + C08 Pengaturan.
Happy path to beat: 2 taps from launch to an episode (C01 card -> C04 source), with no ad and no gate.

## Size

Screens 8 seen (4 more inferred), flows 7 (5 in scope), entities 8 (5 in scope). Hard parts: a lawful source for
"what is new" and "where to watch", alerts at air time without a server, a rate-limited third-party API.
Size: M for the slice in scope.
