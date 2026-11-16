import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Check, House, Unlink } from 'lucide-react';
import { Button, ButtonLink, OfficialPlayer, SelectField, StateBlock, episodeCount, toast } from '../components';
import { useDocumentTitle, useTitle } from '../hooks';
import { useAnime } from '../lib/query';
import { useEntry, useLibrary, type Snapshot } from '../store/library';
import { parseAnimeId } from './detail.helpers';
import { defaultEpisode, isTrailer, parseWatchTarget, type WatchTarget } from './watch.helpers';
import './watch.css';

function Invalid({ id }: { id: number | null }) {
  useDocumentTitle('Pemutar resmi');
  return (
    <div className="page">
      <StateBlock
        variant="empty"
        icon={<Unlink />}
        title="Tautan pemutar tidak valid"
        body="Alamat videonya tidak lengkap atau salah, jadi tidak ada yang diputar. Buka lagi dari halaman animenya."
        action={
          id === null ? (
            <ButtonLink to="/" variant="primary" icon={<House />}>
              Ke Beranda
            </ButtonLink>
          ) : (
            <ButtonLink to={`/anime/${id}`} variant="primary" icon={<ArrowLeft />}>
              Ke halaman anime
            </ButtonLink>
          )
        }
      />
    </div>
  );
}

function QuickTracker({ anime, count, watched }: { anime: Snapshot; count: number; watched: number[] }) {
  const setWatched = useLibrary((state) => state.setWatched);
  // null = follow the next unwatched episode.
  const [picked, setPicked] = useState<number | null>(null);
  const episode = picked !== null && picked <= count ? picked : defaultEpisode(count, watched);
  const seen = new Set(watched);
  const allSeen = watched.filter((n) => n <= count).length >= count;

  return (
    <section className="watch-tracker" aria-labelledby="watch-tracker-title">
      <h2 id="watch-tracker-title" className="section-title">
        Sudah nonton?
      </h2>
      <div className="watch-tracker__row">
        <SelectField
          className="watch-tracker__select"
          label="Episode"
          value={String(episode)}
          onChange={(value) => setPicked(Number(value))}
          options={Array.from({ length: count }, (_, i) => ({
            value: String(i + 1),
            label: seen.has(i + 1) ? `Episode ${i + 1} (sudah ditonton)` : `Episode ${i + 1}`,
          }))}
        />
        <Button
          variant="primary"
          icon={<Check />}
          disabled={seen.has(episode)}
          onClick={() => {
            setWatched(anime, episode, true, Date.now());
            setPicked(null);
            toast(`Episode ${episode} ditandai sudah ditonton`);
          }}
        >
          Tandai sudah ditonton
        </Button>
      </div>
      <p className="muted text-sm" role="status">
        {allSeen
          ? `Semua ${count} episode sudah ditandai.`
          : seen.has(episode)
            ? `Episode ${episode} sudah ditandai. Pilih episode lain kalau mau menandai yang berikutnya.`
            : 'Tandanya tersimpan di perangkat ini dan muncul di Koleksi.'}
      </p>
    </section>
  );
}

function Player({ id, target, trailer }: { id: number; target: WatchTarget; trailer: boolean }) {
  // The player does not wait for this: the title and the tracker fill in when the data arrives.
  const query = useAnime(id);
  const entry = useEntry(id);
  const pickTitle = useTitle();
  const anime: Snapshot | undefined = query.data ?? entry?.snapshot;
  const title = anime ? pickTitle(anime.title) : '';
  const watched = entry?.watched ?? [];
  const count = anime ? episodeCount({ episodes: anime.episodes, nextAiring: query.data?.nextAiring }, watched) : 0;

  useDocumentTitle(title || 'Pemutar resmi');

  return (
    <div className="page watch">
      <div className="watch-main">
        <h2 className="section-title">{trailer ? 'Trailer resmi' : 'playlistId' in target ? 'Playlist resmi' : 'Video resmi'}</h2>
        <OfficialPlayer
          title={title || 'anime ini'}
          videoId={'videoId' in target ? target.videoId : null}
          playlistId={'playlistId' in target ? target.playlistId : null}
        />
        <p className="muted text-sm">
          Videonya diputar oleh pemutar resmi YouTube, langsung dari kanal pemegang haknya. myanime tidak menyimpan video apa pun.
        </p>
      </div>

      {!trailer && anime && count > 0 ? <QuickTracker anime={anime} count={count} watched={watched} /> : null}

      <div>
        <ButtonLink to={`/anime/${id}`} variant="ghost" icon={<ArrowLeft />}>
          Ke halaman anime
        </ButtonLink>
      </div>
    </div>
  );
}

// C05
export default function Watch() {
  const id = parseAnimeId(useParams().id);
  const [params] = useSearchParams();
  const target = parseWatchTarget(params);
  if (id === null || target === null) return <Invalid id={id} />;
  return <Player key={id} id={id} target={target} trailer={isTrailer(params)} />;
}
