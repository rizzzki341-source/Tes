import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Bell, CalendarClock, Clapperboard, House, Search, SearchX, Share2, Star } from 'lucide-react';
import {
  AnimeCard,
  Button,
  ButtonLink,
  ChipLink,
  ConfirmDialog,
  EpisodeTracker,
  ExternalLink,
  IconButton,
  Poster,
  Rail,
  SelectField,
  SourceList,
  StateBlock,
  StatusChip,
  TopBarActions,
  episodeCount,
  toast,
} from '../components';
import { useDocumentTitle, useNow, useTitle } from '../hooks';
import type { AnimeDetail, OfficialEpisode } from '../lib/anilist/types';
import { GENRES, LIST_LABEL, STATUS_LABEL, formatScore, genreLabel } from '../lib/catalog';
import { ensureAlertPermission } from '../lib/notifications';
import { isNative, shareLink } from '../lib/platform';
import { useAnime } from '../lib/query';
import { YT_ID, safeHttpsUrl, toWatchSources } from '../lib/sources';
import { useEntry, useLibrary, type ListStatus } from '../store/library';
import {
  airingDateTime,
  factRows,
  metaParts,
  nextEpisodeText,
  otherTitle,
  parseAnimeId,
  progressText,
  relationText,
  statusTone,
  synopsisParagraphs,
  translateUrl,
} from './detail.helpers';
import './detail.css';

const EPISODE_LINKS_SHOWN = 12;
const GENRE_IDS = new Set(GENRES.map((genre) => genre.id));

const LIST_OPTIONS: { value: ListStatus | ''; label: string }[] = [
  { value: '', label: 'Belum masuk daftar' },
  { value: 'plan', label: LIST_LABEL.plan },
  { value: 'watching', label: LIST_LABEL.watching },
  { value: 'done', label: LIST_LABEL.done },
];

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section className={['detail-section', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <h2 id={headingId} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Missing({ body }: { body: string }) {
  return (
    <div className="page">
      <StateBlock
        variant="empty"
        icon={<SearchX />}
        title="Anime ini tidak ditemukan"
        body={body}
        action={
          <>
            <ButtonLink to="/" variant="primary" icon={<House />}>
              Ke Beranda
            </ButtonLink>
            <ButtonLink to="/cari" icon={<Search />}>
              Cari anime
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}

function NextEpisode({ detail }: { detail: AnimeDetail }) {
  const now = useNow();
  const next = detail.nextAiring;
  if (!next) return null;
  const atMs = next.airingAt * 1000;
  return (
    <section className="detail-next" aria-label="Episode berikutnya">
      <CalendarClock className="detail-next__icon" aria-hidden="true" />
      <div className="detail-next__text">
        <p className="detail-next__main">{nextEpisodeText(next.episode, atMs, now)}</p>
        <p className="muted text-sm">
          <time dateTime={new Date(atMs).toISOString()}>{airingDateTime(atMs)}</time>, waktu perangkatmu
          {detail.episodes !== null && next.episode === detail.episodes ? ' · episode terakhir' : ''}
        </p>
      </div>
    </section>
  );
}

function Synopsis({ text }: { text: string }) {
  const paragraphs = synopsisParagraphs(text);
  const boxId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // The button only makes sense when the clamp really hides something at this width.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || expanded) return;
    const measure = () => setOverflows(box.scrollHeight - box.clientHeight > 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [expanded, text]);

  if (paragraphs.length === 0) {
    return <p className="muted">Belum ada sinopsis untuk judul ini.</p>;
  }

  return (
    <>
      <div
        id={boxId}
        ref={boxRef}
        className="detail-synopsis"
        data-clamped={expanded ? undefined : 'true'}
        data-faded={!expanded && overflows ? 'true' : undefined}
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="prose">
            {paragraph}
          </p>
        ))}
      </div>
      {overflows ? (
        <div>
          <Button size="sm" variant="ghost" aria-expanded={expanded} aria-controls={boxId} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Ringkas' : 'Selengkapnya'}
          </Button>
        </div>
      ) : null}
      <p className="muted text-sm">
        Sinopsisnya dari AniList dan berbahasa Inggris.{' '}
        <ExternalLink href={translateUrl(paragraphs.join('\n\n'))}>Terjemahkan</ExternalLink>
      </p>
    </>
  );
}

function OfficialEpisodes({ episodes }: { episodes: OfficialEpisode[] }) {
  const listId = useId();
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? episodes : episodes.slice(0, EPISODE_LINKS_SHOWN);
  return (
    <Section title="Tautan episode resmi">
      <p className="muted text-sm">Tiap tautan membuka episodenya di layanan resminya.</p>
      <ul id={listId} className="detail-links">
        {shown.map((episode, index) => (
          <li key={`${episode.url}#${index}`} className="detail-links__item">
            <ExternalLink href={episode.url}>{episode.title || `Episode resmi ${index + 1}`}</ExternalLink>
            {episode.site ? <span className="muted text-sm">{episode.site}</span> : null}
          </li>
        ))}
      </ul>
      {episodes.length > EPISODE_LINKS_SHOWN ? (
        <div>
          <Button size="sm" aria-expanded={showAll} aria-controls={listId} onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${episodes.length})`}
          </Button>
        </div>
      ) : null}
    </Section>
  );
}

function Loaded({ detail, title, notice }: { detail: AnimeDetail; title: string; notice?: ReactNode }) {
  const entry = useEntry(detail.id);
  const dataSaver = useLibrary((state) => state.settings.dataSaver);
  const toggleSubscribe = useLibrary((state) => state.toggleSubscribe);
  const setList = useLibrary((state) => state.setList);
  const setWatched = useLibrary((state) => state.setWatched);
  const markWatchedThrough = useLibrary((state) => state.markWatchedThrough);
  const clearProgress = useLibrary((state) => state.clearProgress);
  const refreshSnapshot = useLibrary((state) => state.refreshSnapshot);
  const [askClear, setAskClear] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Keeps the saved title, cover and status current for titles that are in the library.
  useEffect(() => {
    refreshSnapshot(detail);
  }, [detail, refreshSnapshot]);

  const banner = dataSaver || bannerFailed ? null : safeHttpsUrl(detail.banner);
  const second = otherTitle(detail.title, title);
  const meta = metaParts(detail);
  const score = formatScore(detail.score);
  const sources = toWatchSources(detail.links);
  const trailerId = detail.trailerYoutubeId && YT_ID.test(detail.trailerYoutubeId) ? detail.trailerYoutubeId : null;
  const genres = detail.genres.filter((genre) => GENRE_IDS.has(genre));
  const watched = entry?.watched ?? [];
  const count = episodeCount(detail, watched);
  const done = watched.filter((episode) => episode <= count).length;
  const episodeLinks = detail.officialEpisodes.filter((episode) => safeHttpsUrl(episode.url) !== null);
  const facts = factRows(detail);
  const subscribed = entry?.subscribed ?? false;

  const share = async () => {
    const url = isNative() ? detail.siteUrl : window.location.href;
    const result = await shareLink({ title, url });
    if (result === 'copied') toast('Tautan disalin');
  };

  const onSubscribe = () => {
    const on = toggleSubscribe(detail, Date.now());
    toast(on ? 'Masuk langganan' : 'Langganan dihapus');
    if (!on) return;
    void ensureAlertPermission().then((permission) => {
      if (permission === 'denied') toast('Izin notifikasi belum aktif. Nyalakan dulu supaya kamu dikabari saat episode baru tayang.');
    });
  };

  const onList = (value: ListStatus | '') => {
    setList(detail, value === '' ? null : value, Date.now());
    toast(value === '' ? 'Dihapus dari daftar' : `Masuk daftar: ${LIST_LABEL[value]}`);
  };

  return (
    <div className="page detail">
      <TopBarActions>
        <IconButton label="Bagikan" icon={<Share2 />} onClick={() => void share()} />
      </TopBarActions>
      {notice}

      <div className="detail-head" data-banner={banner ? 'true' : undefined}>
        {banner ? (
          <img
            className="detail-head__banner"
            src={banner}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBannerFailed(true)}
          />
        ) : null}
        <div className="detail-head__row">
          <div className="detail-head__poster">
            <Poster cover={detail.cover} coverSmall={detail.coverSmall} title={title} decorative eager />
          </div>
          <div className="detail-head__info">
            <h2 className="detail-head__title">{title}</h2>
            {second ? <p className="detail-head__alt muted">{second}</p> : null}
            {meta.length > 0 ? <p className="muted text-sm">{meta.join(' · ')}</p> : null}
            <div className="cluster">
              {score ? (
                <span className="detail-head__score">
                  <Star aria-hidden="true" />
                  <span className="visually-hidden">Skor </span>
                  {score}
                </span>
              ) : null}
              {detail.status ? <StatusChip tone={statusTone(detail.status)}>{STATUS_LABEL[detail.status]}</StatusChip> : null}
            </div>
          </div>
        </div>
      </div>

      <NextEpisode detail={detail} />

      <div className="detail-actions">
        <Button className="detail-actions__subscribe" icon={<Bell />} pressed={subscribed} onClick={onSubscribe}>
          Langganan
        </Button>
        <SelectField<ListStatus | ''>
          className="detail-actions__list"
          label="Daftar"
          value={entry?.list ?? ''}
          onChange={onList}
          options={LIST_OPTIONS}
        />
        <Button className="detail-actions__share" icon={<Share2 />} onClick={() => void share()}>
          Bagikan
        </Button>
      </div>

      <Section title="Tonton resmi">
        <SourceList mediaId={detail.id} sources={sources} />
        {sources.length > 0 ? (
          <p className="muted text-sm">Ketersediaan dan subtitle tergantung tiap platform dan wilayah kamu.</p>
        ) : null}
        {trailerId ? (
          <div>
            <ButtonLink to={`/anime/${detail.id}/tonton?v=${encodeURIComponent(trailerId)}&t=trailer`} icon={<Clapperboard />}>
              Tonton trailer
            </ButtonLink>
          </div>
        ) : null}
      </Section>

      <Section title="Sinopsis">
        <Synopsis text={detail.description} />
      </Section>

      {genres.length > 0 ? (
        <Section title="Genre">
          <ul className="cluster">
            {genres.map((genre) => (
              <li key={genre}>
                <ChipLink to={`/cari?genre=${encodeURIComponent(genre)}`}>{genreLabel(genre)}</ChipLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Episode" className="detail-episodes">
        {count > 0 ? (
          <div className="detail-progress">
            <p className="text-sm">{progressText(done, count)}</p>
            <progress className="detail-progress__bar" max={count} value={Math.min(done, count)} aria-label="Progres menonton" />
          </div>
        ) : null}
        <EpisodeTracker
          count={count}
          watched={watched}
          onToggle={(episode, on) => setWatched(detail, episode, on, Date.now())}
          onMarkThrough={(episode) => {
            markWatchedThrough(detail, episode, Date.now());
            toast(episode === 1 ? 'Episode 1 ditandai sudah ditonton' : `Episode 1–${episode} ditandai sudah ditonton`);
          }}
          onClear={() => setAskClear(true)}
        />
      </Section>

      {episodeLinks.length > 0 ? <OfficialEpisodes episodes={episodeLinks} /> : null}

      <Rail title="Terkait">
        {detail.relations.map(({ relation, anime }) => (
          <AnimeCard key={anime.id} anime={anime} layout="rail" badge={relationText(relation)} />
        ))}
      </Rail>

      <Rail title="Mirip dengan ini">
        {detail.recommendations.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} layout="rail" />
        ))}
      </Rail>

      <Section title="Info">
        {facts.length > 0 ? (
          <dl className="detail-facts">
            {facts.map((fact) => (
              <div key={fact.label} className="detail-facts__row">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="muted text-sm">
          Data: <ExternalLink href={detail.siteUrl}>AniList</ExternalLink>
        </p>
      </Section>

      <ConfirmDialog
        open={askClear}
        danger
        title="Hapus progres menonton?"
        body={`Semua tanda episode untuk ${title} dihapus, termasuk dari riwayat. Langganan dan daftarmu tidak berubah.`}
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          clearProgress(detail.id, Date.now());
          setAskClear(false);
          toast('Progres dihapus');
        }}
        onCancel={() => setAskClear(false)}
      />
    </div>
  );
}

function DetailQuery({ id }: { id: number }) {
  const query = useAnime(id);
  const pickTitle = useTitle();
  const missing = !query.data && query.isError && query.error.kind === 'not-found';
  const title = query.data ? pickTitle(query.data.title) : missing ? 'Tidak ditemukan' : 'Detail anime';
  useDocumentTitle(title);

  if (query.data) {
    return (
      <Loaded
        detail={query.data}
        title={title}
        notice={
          query.isError ? <StateBlock variant="stale" onReload={() => void query.refetch()} reloading={query.isFetching} /> : null
        }
      />
    );
  }
  if (missing) {
    return <Missing body="Judul dengan nomor ini tidak ada di AniList. Bisa jadi tautannya salah atau judulnya sudah dihapus." />;
  }
  if (query.isError) {
    return (
      <div className="page">
        <StateBlock variant="error" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </div>
    );
  }
  return (
    <div className="page">
      <StateBlock variant="loading" shape="detail" label="Sedang memuat detail anime" />
    </div>
  );
}

function InvalidId() {
  useDocumentTitle('Tidak ditemukan');
  return <Missing body="Alamat halaman ini tidak valid. Coba buka animenya lagi dari Beranda atau Cari." />;
}

// C04
export default function Detail() {
  const id = parseAnimeId(useParams().id);
  if (id === null) return <InvalidId />;
  // The key resets the expanded parts when one detail page links to another.
  return <DetailQuery key={id} id={id} />;
}
