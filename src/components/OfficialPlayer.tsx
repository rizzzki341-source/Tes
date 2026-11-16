import { ExternalLink, WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';
import { YT_ID, youtubeEmbedUrl, youtubeWatchUrl } from '../lib/sources';
import { ButtonLink } from './Button';
import { StateBlock } from './StateBlock';

export interface OfficialPlayerProps {
  /** Anime title, used in the iframe title. */
  title: string;
  /** YouTube video id (`?v=`). */
  videoId?: string | null;
  /** YouTube playlist id (`?list=`); wins over `videoId` when both are valid. */
  playlistId?: string | null;
}

/** The unmodified official YouTube player in a 16:9 frame, plus a link to YouTube itself. */
export function OfficialPlayer({ title, videoId, playlistId }: OfficialPlayerProps) {
  const online = useOnline();
  const source =
    playlistId && YT_ID.test(playlistId) ? { playlistId } : videoId && YT_ID.test(videoId) ? { videoId } : null;

  if (!source) {
    return (
      <StateBlock
        variant="empty"
        title="Videonya tidak bisa dibuka"
        body="Tautan pemutar ini tidak lengkap atau salah. Coba buka lagi dari halaman animenya."
      />
    );
  }

  return (
    <div className="player">
      {online ? null : (
        <p className="player__offline" role="status">
          <WifiOff aria-hidden="true" />
          Kamu lagi offline. Videonya baru bisa diputar setelah tersambung lagi.
        </p>
      )}
      <div className="player__frame">
        <iframe
          className="player__iframe"
          src={youtubeEmbedUrl(source)}
          title={`Pemutar YouTube resmi: ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          // YouTube refuses to play without an http(s) referrer.
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="player__actions">
        <ButtonLink href={youtubeWatchUrl(source)} icon={<ExternalLink />}>
          Buka di YouTube
          <span className="visually-hidden"> (tab baru)</span>
        </ButtonLink>
        <p className="field__hint">Kalau pemutarnya kosong, pemilik videonya mungkin hanya mengizinkan diputar di YouTube.</p>
      </div>
    </div>
  );
}
