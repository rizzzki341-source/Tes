# Brand: myanime

## Name

The owner chose **myanime** (always lowercase). It was not picked from a candidate list, so the filter that
matters is the trademark one, and it raises a flag that needs a decision before any store release:

- **MyAnimeList** is a long-established anime database and tracker in the same category. "myanime" is its
  first two words.
- An app called **"MyAnime - Anime Tracker"** is already on the Apple App Store (developer "Pinki",
  id6757398912), and an older social app also used "MyAnime". Found by web search on 2026-11-16.

Same category plus near-identical wording is exactly what trademark offices test. The code keeps the name in
one place (`capacitor.config.ts`, `index.html`, the wordmark component, `android/app/src/main/res/values/strings.xml`),
so changing it later is a small edit. If the owner wants alternatives that keep the idea ("anime, mine, on
time"): **Tayangku**, **Jamtayang**, **Animeku Jadwal**, **Episodeku**, **Rilisan**. None of these has been
checked either.

| check | where | myanime |
| --- | --- | --- |
| the web | search "MyAnime app" | run 2026-11-16: conflicts found (see above) |
| App Store and Play | exact-name search | App Store: existing app "MyAnime - Anime Tracker" (2026-11-16). Play: **to run** |
| Indonesia trademark | pdki-indonesia.dgip.go.id, classes 9, 41, 42 | **to run** |
| US trademark | tmsearch.uspto.gov | **to run** |
| EU trademark | euipo.europa.eu eSearch / TMview | **to run** |
| global | WIPO Global Brand Database | **to run** |
| domain | registrar search for myanime.* | **to run** |
| handles | X, Instagram, TikTok, GitHub | **to run** |

These are screening checks, not legal clearance. A trademark lawyer should look before money is spent on the name.

## Palette

The original is black with a yellow-to-gold mark. myanime is a dark interface with a **mint green** accent, a
different hue family. Values live in `design/tokens.json`; `contrast.py` reports 20 pairs, 0 failing AA.
The original's golds are listed in `brand.json` so the sweep catches any that slip in.

| role | value |
| --- | --- |
| bg / surface / surface-2 | `#0e1116` / `#171b22` / `#20262f` |
| text / text-muted | `#f2f5f8` / `#a7b0bd` |
| accent / on-accent | `#3ddc97` / `#06281b` |
| danger / success / warning | `#ff8a8a` / `#7ee787` / `#ffb454` |

## Logo brief

- Idea: "the next episode is ready". A rounded square with a play triangle whose tip carries a small dot, like
  a notification on a play button.
- Mark type: symbol plus lowercase wordmark "myanime" in the system sans, weight 800.
- Must read at 16 px (favicon) and as a 1024 px icon; flat, two colours (mint on near-black), no gradient.
- Deliverables: SVG, Android adaptive icon (foreground + background), favicon, 1200x630 social image.
- Must not resemble the original's mark: no letter "W", no chevrons, no yellow or gold, no black-and-gold pair.
- The shipped `assets/logo.svg` is a first draft made to this brief, drawn from scratch.

## Voice

Santai (not sloppy), jelas (not cold), jujur (not preachy).

| do | don't |
| --- | --- |
| "Episode 8 tayang 2 jam lagi." | "Nantikan keseruan episode terbaru hanya di sini!!!" |
| "Belum ada sumber resmi untuk judul ini." | "Video tidak tersedia." with no reason |
| "Tidak ada koneksi. Yang tersimpan tetap bisa dibuka." | "Error 0x1F. Silakan restart aplikasi." |
| "Langganan" / "Berhenti langganan" | "Subscribe sekarang untuk pengalaman terbaik" |
| say what the app does not do (no streaming of its own) | promise "semua anime gratis" |

Ten most-seen strings: Beranda · Jadwal · Cari · Koleksi · "Episode terbaru" · "Langganan" · "Tonton resmi" ·
"Coba lagi" · "Belum ada apa-apa di sini" · "Menampilkan data tersimpan".

## Sweep

`python3 .claude/skills/replica-brand/sweep.py . --config replica/brand.json` must exit 0 before any release
(result recorded in `parity.md`).
