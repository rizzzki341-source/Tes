import { useMemo } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { AnimeCard, Button, ChipLink, ExternalLink, FeaturedCarousel, Rail, StateBlock } from '../components';
import { useDocumentTitle, useNow, useOnline } from '../hooks';
import { GENRES } from '../lib/catalog';
import { useHome } from '../lib/query';
import { relativeTime } from '../lib/time';
import { useLibrary } from '../store/library';
import { continueLabel, continueWatching, latestPerAnime, progressLabel, seasonSearchPath } from './home.helpers';
import './home.css';

const FEATURED_COUNT = 6;

// C01 Beranda
export default function Home() {
  useDocumentTitle('Beranda');
  const query = useHome();
  const online = useOnline();
  const now = useNow(60_000);
  const entries = useLibrary((state) => state.entries);

  const { data } = query;
  const resume = useMemo(() => continueWatching(Object.values(entries)), [entries]);
  const latest = useMemo(() => latestPerAnime(data?.latest ?? []), [data]);

  // Offline with nothing cached leaves the query paused: that is not "loading".
  const waitingForNetwork = !data && query.fetchStatus === 'paused';
  const loading = query.isPending && !waitingForNetwork;
  const reload = () => void query.refetch();
  const nothingListed =
    data !== undefined &&
    latest.length + data.trending.length + data.season.length + data.upcoming.length + data.movies.length + data.top.length === 0;

  return (
    <div className="page home">
      {data && !online ? (
        <p className="home-notice" role="status">
          <WifiOff aria-hidden="true" />
          Kamu lagi offline. Yang tampil ini data tersimpan.
        </p>
      ) : data && query.isError ? (
        <StateBlock variant="stale" onReload={reload} reloading={query.isFetching} />
      ) : null}

      <Rail title="Lanjut nonton" seeAllTo="/koleksi?tab=daftar">
        {resume.map((item) => (
          <AnimeCard
            key={item.entry.id}
            anime={item.entry.snapshot}
            layout="rail"
            badge={item.next === null ? undefined : continueLabel(item)}
            meta={progressLabel(item.entry)}
            sublabel={item.next === null ? continueLabel(item) : undefined}
          />
        ))}
      </Rail>

      {loading ? <div className="skeleton skeleton--banner home-featured-skeleton" aria-hidden="true" /> : null}
      {data ? <FeaturedCarousel items={data.trending.slice(0, FEATURED_COUNT)} /> : null}

      {waitingForNetwork ? (
        <StateBlock
          variant="empty"
          icon={<WifiOff />}
          title="Lagi offline"
          body="Belum ada data tersimpan di perangkat ini. Sambungkan internet dulu, lalu coba lagi."
          action={
            <Button variant="primary" icon={<RefreshCw />} onClick={reload}>
              Coba lagi
            </Button>
          }
        />
      ) : query.isError && !data ? (
        <StateBlock variant="error" error={query.error} onRetry={reload} retrying={query.isFetching} />
      ) : null}

      <section className="home-genres" aria-labelledby="home-genres-title">
        <h2 id="home-genres-title" className="section-title">
          Jelajahi genre
        </h2>
        <ul className="chip-row">
          {GENRES.map((genre) => (
            <li key={genre.id}>
              <ChipLink to={`/cari?genre=${encodeURIComponent(genre.id)}`}>{genre.label}</ChipLink>
            </li>
          ))}
        </ul>
      </section>

      {nothingListed ? (
        <StateBlock
          variant="empty"
          title="Belum ada apa-apa di sini"
          body="Sumber data belum mengirim daftar anime. Coba muat ulang sebentar lagi."
          action={
            <Button icon={<RefreshCw />} disabled={query.isFetching} onClick={reload}>
              Muat ulang
            </Button>
          }
        />
      ) : null}

      <Rail title="Episode terbaru" seeAllTo="/jadwal" loading={loading}>
        {latest.map((item) => (
          <AnimeCard
            key={item.anime.id}
            anime={item.anime}
            layout="rail"
            badge={`Ep ${item.episode}`}
            sublabel={relativeTime(item.airingAt * 1000, now)}
          />
        ))}
      </Rail>
      <Rail title="Musim ini" seeAllTo={seasonSearchPath(now)} loading={loading}>
        {data?.season.map((anime) => <AnimeCard key={anime.id} anime={anime} layout="rail" />)}
      </Rail>
      <Rail title="Segera tayang" seeAllTo="/cari?status=NOT_YET_RELEASED" loading={loading}>
        {data?.upcoming.map((anime) => <AnimeCard key={anime.id} anime={anime} layout="rail" />)}
      </Rail>
      <Rail title="Film" seeAllTo="/cari?format=MOVIE&sort=TRENDING_DESC" loading={loading}>
        {data?.movies.map((anime) => <AnimeCard key={anime.id} anime={anime} layout="rail" />)}
      </Rail>
      <Rail title="Skor tertinggi" seeAllTo="/cari?sort=SCORE_DESC" loading={loading}>
        {data?.top.map((anime) => <AnimeCard key={anime.id} anime={anime} layout="rail" />)}
      </Rail>

      {data ? (
        <p className="home-source muted text-sm">
          Daftar ini diperbarui otomatis dari jadwal tayang. Data: <ExternalLink href="https://anilist.co">AniList</ExternalLink>
        </p>
      ) : null}
    </div>
  );
}
