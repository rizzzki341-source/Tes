import { Link } from 'react-router';
import { useTitle } from '../hooks/useTitle';
import type { Anime } from '../lib/anilist/types';
import { FORMAT_LABEL, formatScore } from '../lib/catalog';
import { Poster } from './Poster';

/** The fields a card needs. Both `Anime` and a library `Snapshot` fit. */
export type CardAnime = Pick<Anime, 'id' | 'title' | 'cover' | 'coverSmall' | 'format'> & { score?: number | null };

export interface AnimeCardProps {
  anime: CardAnime;
  /** Corner badge, e.g. "Ep 8" or "Film". */
  badge?: string;
  /** Line under the meta line, e.g. "2 jam lalu". */
  sublabel?: string;
  /** Replaces the default meta line ("Seri TV · 8,6"). */
  meta?: string;
  /** Link target; defaults to `/anime/<id>`. */
  to?: string;
  /** `rail` = fixed poster width, `grid` = fills its grid cell. */
  layout?: 'rail' | 'grid';
  /** Load the image immediately (first screenful only). */
  eager?: boolean;
}

export function animeMeta(anime: CardAnime): string {
  return [anime.format ? FORMAT_LABEL[anime.format] : null, formatScore(anime.score)].filter(Boolean).join(' · ');
}

export function AnimeCard({ anime, badge, sublabel, meta, to, layout = 'grid', eager }: AnimeCardProps) {
  const title = useTitle()(anime.title);
  const metaLine = meta ?? animeMeta(anime);
  return (
    <Link
      to={to ?? `/anime/${anime.id}`}
      className={`card card--${layout}`}
      aria-label={[title, badge, sublabel].filter(Boolean).join(', ')}
    >
      <div className="card__media">
        <Poster cover={anime.cover} coverSmall={anime.coverSmall} title={title} decorative eager={eager} />
        {badge ? <span className="card__badge">{badge}</span> : null}
      </div>
      <span className="card__title">{title}</span>
      {metaLine ? <span className="card__meta">{metaLine}</span> : null}
      {sublabel ? <span className="card__sub">{sublabel}</span> : null}
    </Link>
  );
}
