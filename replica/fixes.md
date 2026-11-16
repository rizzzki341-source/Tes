# What the original's users hate, and what myanime does about it

Sample: **324 reviews** after de-duplication. 319 from Google Play (read on 2026-11-16 in the listing's "all
reviews" view, phone reviews, dated 2026-08-18 to 2026-11-14: 169 five-star, 51 four-star, 31 three-star,
21 two-star, 48 one-star) and 5 comments from Uptodown (no ratings shown). That is effectively **one source**.
`reviews.py` therefore marks most themes "thin": read the counts as "among recent Google Play reviewers", not
as a market survey. Full ranking: `feedback.md`. Raw rows with links: `reviews.csv`.

Quote links all start with `https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=`.

## 1. What they hate

1. **The app will not open: "security token" loop, stuck on the logo, forced re-login.** 53 reviews, average 2.4 stars, the angriest theme.
   - "saya TDK bisa login sinyal padahal lancar follow up dulu min,malah muncul tulisan MEMPERBAHARUI TOKEN KEAMANAN katanya" (1 star, [e83f7324](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=e83f7324-22a8-4ac2-9193-2e3aa92cbcbc))
   - "Tolong tambahkan fitur Skip opening,sudah berkali kali update masih saja sering relog akun otomatis,lalu satu akun hanya support 1 perangkat saja" (1 star, [6c2725d8](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=6c2725d8-b7d2-4d6b-aad5-814a22be2037))
2. **Premium, payments and lost purchases.** 88 reviews mention premium or paying (average 3.7; many are neutral mentions, the low ones are about paid time lost to resets and outages).
   - "padahal udah beli premium setahun" (1 star, [3462ed4d](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=3462ed4d-0067-4fe4-a31a-680eafce07a3))
3. **Anime, episodes and movies missing.** 79 reviews.
   - "tambah movie nya dong, masa segitu doang dari dulu gak pernah nambah movie nya, nambah fitur semangat banget, tpi ga ada niatan nambah movie" (5 stars, [4a2afef8](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=4a2afef8-6c9b-4c79-870b-f9614315858a))
   - "banyak anime yg gk lanjut episode terbaru (padahal di apk lain ada)" (1 star, [1200fafb](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=1200fafb-5d43-4d18-b18d-f4136ca24f5b))
4. **Ads and the "key" system.** 75 reviews.
   - "min ini kunci nya tidak mau bertambah saya tadi sudah menonton iklan dan juga sudah kena waktu tunggu tapi kunci nya tidak mau bertambah tolong min" (5 stars, [60ba4b47](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=60ba4b47-2e57-450e-b7ab-b56606d2fd9b))
5. **Bugs, force closes, each update worse.** 52 reviews.
6. **Buffering, lag, server errors.** 41 reviews. "Tolong diperbaiki servernya, kalau sudah stabil saya naikkan bintang 5" (2 stars, [36dff83f](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=36dff83f-92d8-4670-affe-838bd9cec9b1))
7. **The social layer getting in the way** (chat, likes, clans, pets, fishing). 51 mentions, mixed: some enjoy it, the complaints are about begging and bloat.
   - "yang paling gasuka sistem like someone, jujur minus (minusnya banyak yang ngemis like di chat global + iming-iming janji manis/bt gift premium)" (5 stars, [9482f6d1](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=9482f6d1-7d7c-4cd7-ab71-eb641b7b8b41))
8. **Accounts reset, one device only, support that does not answer.** 36 reviews.
   - "aplikasinya bagus cuman akun saya tiba tiba ke reset padahal tidak saya apa apakan,saya sudah berkali kali mengirim email tentang akun saya tetapi tidak ada satupun yang dibalas" (1 star, [bb299551](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=bb299551-ba26-4f94-a08d-b50df9ec0104))
9. **Video errors** 27, **late or missing notifications** 11, **late updates** 10. Thin, but the most helpful review on the page (223 "helpful") names all of them: "Saran saya Animenya lebih diperlengkap apalagi movienya sangat kurang dan kadang ada Anime yang EROR/tidak bisa ditonton, dan iklannya tolong lebih diperpendek waktunya, max 30 detik, dan untuk pemberitahuan anime tamat sangat telat" (5 stars, [4c23bb7b](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=4c23bb7b-a5be-44ee-b218-17e8c10b58a3))

## 2. What is missing

1. **Offline downloads that work.** 21 reviews mention downloading. Not something a lawful clone can offer (see below).
2. **Better search and genre browsing.** 22 reviews (genre menu empty or stale, titles hard to find).
3. **Skip intro and player extras.** 6 reviews. "tolong dong ini apk udah bagus, tampilan beranda makin cakep, tapi kaya kurang gitu kalo gaada fitur skip intro" (4 stars, [18ee43a6](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=18ee43a6-c15f-4ef0-8f73-081849e94189)). Thin.
4. **A web version.** 1 review: "gimana kalo mimin nambahin wibuku di web juga" (5 stars, [577a2c98](https://play.google.com/store/apps/details?id=wibuku.app.wibuku&hl=id&gl=ID&reviewId=577a2c98-aa96-421c-b4a1-24038c6c2e26)). Thin, but free with this stack.

## 3. What is unsolved

1. **People who just want to watch.** Every release adds games and social systems while the watching part breaks. "padahal fungsi aplikasi ini kan buat nonton" (same review as 1.3 above).
2. **People who paid and lost it.** Resets, one device, no reply from support.
3. **People who want it lawful and stable.** One reviewer already points others to the official YouTube channels; the news coverage (recon source 7) says the service can be blocked at any time.

## Fix plan

| # | fix | size | skill | evidence |
| --- | --- | --- | --- | --- |
| 1 | No gate: no login, no token handshake, no blocking splash. The shell opens from local cache and refreshes behind it | S | build | 1.1 (53 reviews) |
| 2 | No ads, no keys, nothing to buy | S | build | 1.2, 1.4 (88, 75) |
| 3 | Complete catalogue from a public database, with a Film rail and filters by year, season, format and status | M | build | 1.3 (79), 2.2 (22) |
| 4 | Every title shows where it can be watched officially; official YouTube playlists and trailers play inside the app. If nothing official is recorded, say so instead of failing | M | build | 1.9 video errors (27), unsolved 3 |
| 5 | Episode alerts scheduled on the phone at the published air time, plus a finale alert and an in-app inbox | M | build | 1.9 notifications (11, incl. the 223-helpful review) |
| 6 | New episodes appear by themselves from the live schedule, with a countdown to the next one | S | build | 1.9 late updates (10) |
| 7 | Honest error states: retry, cached content when offline, one broken screen never takes the app down; tests run on every change | M | build, test | 1.5, 1.6 (52, 41) |
| 8 | Backup and restore as plain text, no account, no device limit | S | build | 1.8 (36) |
| 9 | Nothing but watching: no chat, likes, levels, pets or games | S | - | 1.7, unsolved 1 |
| 10 | Also runs in a browser | S | build | 2.4 (1, thin) |

Not fixed, on purpose: offline downloads (2.1) and skip-intro on third-party players (2.3). Official sources do
not allow either from another app. All ten fixes are rows in `features.csv` (`original` = no).

## The angle

1. **For viewers who are tired of an app that will not even open**, myanime starts instantly, with no login, no ads and no keys. Evidence: themes 1.1, 1.2, 1.4 (53 + 88 + 75 reviews, one source).
2. **For viewers who only want to know when the next episode is out and where**, myanime tracks the schedule and takes them to the official source. Evidence: 1.3, 1.9, unsolved 3.
3. **For viewers who lost their history once already**, myanime keeps everything on the phone and lets them back it up. Evidence: 1.8 (36 reviews).

Recommended: **1 as the hook, 2 as the promise**. "Langsung buka, tanpa login, tanpa iklan. Tahu kapan episode
berikutnya tayang dan di mana menontonnya secara resmi." The original's name stays out of the app name, the
listing and any ad. Reviewers' words above are research, not testimonials.
