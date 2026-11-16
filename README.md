# myanime

Pemandu dan pelacak anime berbahasa Indonesia: episode yang baru tayang, jadwal harian, langganan dengan
pengingat, dan tautan tonton **resmi** untuk tiap judul. Langsung terbuka tanpa login, tanpa iklan.

Satu kode untuk web dan Android (Vite + React + TypeScript, dibungkus Capacitor).

## Yang dilakukan dan yang tidak

- Katalog, jadwal, dan episode terbaru dibaca langsung dari [AniList](https://anilist.co) setiap kali aplikasi
  dibuka, lalu disimpan di perangkat supaya tetap bisa dibuka saat offline. Tidak ada yang diunggah manual.
- Langganan, daftar tonton, progres episode, dan riwayat disimpan di perangkat. Tidak ada akun; pindah
  perangkat lewat cadangan teks di Pengaturan.
- Pengingat episode dijadwalkan di ponsel tepat pada jam tayang resminya.
- **myanime tidak menyimpan, mengunduh, atau menyiarkan video.** Yang diputar di dalam aplikasi hanya pemutar
  YouTube resmi (trailer dan playlist dari pemegang lisensi). Selebihnya aplikasi membuka platform berlisensi
  seperti Bstation, Crunchyroll, atau Netflix. Ketersediaan dan subtitle mengikuti platform dan wilayahmu.

## Menjalankan

Butuh Node 24 dan npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm test             # tes unit
npm run test:e2e     # Playwright, API dipalsukan dengan rekaman
npm run test:live    # cek singkat ke API AniList yang asli
npm run build        # hasil di dist/
```

## APK Android

```bash
scripts/setup-android.sh          # sekali: JDK 21 + Android SDK (cetak variabel lingkungan yang perlu di-export)
npm run android:apk               # build web, sinkron ke android/, lalu assembleDebug
# hasil: android/app/build/outputs/apk/debug/app-debug.apk
```

CI (`.github/workflows/ci.yml`) menjalankan semua tes dan mengunggah APK debug sebagai artefak
`myanime-debug-apk`. APK debug ditandatangani dengan kunci debug: cukup untuk dipasang dan dicoba, bukan untuk
rilis ke toko. Untuk rilis, buat keystore sendiri dan jangan pernah menyimpannya di repo.

## Struktur

| path | isi |
| --- | --- |
| `src/lib/anilist` | klien GraphQL, query, dan pemetaan data |
| `src/lib` | waktu, sumber tonton, pengingat, cadangan, jembatan native |
| `src/store` | data pengguna (zustand, `localStorage`) |
| `src/components`, `src/screens` | komponen bersama dan layar |
| `tests/unit`, `e2e` | tes unit dan end-to-end |
| `android` | proyek Capacitor Android |
| `replica` | riset dan rencana: recon, ulasan, perbaikan, arsitektur, desain, merek, paritas |
| `.claude/skills` | paket skill Replica yang dipakai untuk mengerjakan ini |

Token desain ada di `replica/design/tokens.json`; `npm run tokens` menghasilkan `src/styles/tokens.css`.

## Sebelum dirilis

- Nama "myanime" mirip dengan merek dan aplikasi lain di kategori yang sama. Baca `replica/brand.md` dan
  jalankan pengecekan mereknya dulu.
- Ketentuan API AniList mengizinkan pemakaian gratis untuk proyek non-komersial. Untuk pemakaian komersial,
  minta izin AniList.
- Ganti `appId` di `capacitor.config.ts` bila punya domain sendiri. Setelah terbit di toko, id tidak bisa diubah.
- Jalankan `python3 .claude/skills/replica-brand/sweep.py . --config replica/brand.json` dan pastikan bersih.
