import { ExternalLink, Play } from 'lucide-react';
import { watchPath, type WatchSource } from '../lib/sources';
import { ButtonLink } from './Button';

export interface SourceListProps {
  mediaId: number;
  /** From `toWatchSources(detail.links)`. */
  sources: WatchSource[];
}

function describe(source: WatchSource): string {
  if (source.kind === 'youtube-playlist') return 'Playlist resmi, bisa diputar di sini';
  if (source.kind === 'youtube-video') return 'Video resmi, bisa diputar di sini';
  return 'Dibuka di aplikasi atau situsnya';
}

/** Official places to watch. YouTube sources play in the app, the rest open the platform itself. */
export function SourceList({ mediaId, sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="sources sources--empty">
        <p className="sources__empty-title">Belum ada sumber resmi yang tercatat</p>
        <p className="field__hint">
          Daftar ini hanya memuat layanan resmi yang tercatat di AniList. Kalau anime ini tayang di layanan lain, coba cek
          langsung di sana.
        </p>
      </div>
    );
  }
  return (
    <ul className="sources">
      {sources.map((source) => (
        <li key={source.url} className="sources__item">
          <div className="sources__text">
            <span className="sources__site">{source.site}</span>
            <span className="sources__kind">{describe(source)}</span>
          </div>
          {source.kind === 'external' ? (
            <ButtonLink href={source.url} size="sm" icon={<ExternalLink />}>
              Buka {source.site}
              <span className="visually-hidden"> (tab baru)</span>
            </ButtonLink>
          ) : (
            <ButtonLink to={watchPath(mediaId, source)} variant="primary" size="sm" icon={<Play />}>
              Putar di sini
              <span className="visually-hidden">: {source.site}</span>
            </ButtonLink>
          )}
        </li>
      ))}
    </ul>
  );
}
