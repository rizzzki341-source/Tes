import { Star } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import type { Anime } from '../lib/anilist/types';
import { FORMAT_LABEL, formatScore, genreLabel } from '../lib/catalog';
import { safeHttpsUrl } from '../lib/sources';
import { useLibrary } from '../store/library';
import { ButtonLink } from './Button';

export interface FeaturedCarouselProps {
  items: Anime[];
  /** Accessible name of the carousel. */
  label?: string;
}

/** Swipeable banner slides (scroll-snap, no autoplay). Renders nothing without items. */
export function FeaturedCarousel({ items, label = 'Lagi ramai dibicarakan' }: FeaturedCarouselProps) {
  const pickTitle = useTitle();
  const dataSaver = useLibrary((state) => state.settings.dataSaver);
  if (items.length === 0) return null;

  return (
    <section className="featured" aria-roledescription="korsel" aria-label={label}>
      <ul className="featured__list">
        {items.map((anime, index) => {
          const title = pickTitle(anime.title);
          // The wide banner is the heaviest image on the home screen, so data saver skips it.
          const image = dataSaver ? null : safeHttpsUrl(anime.banner ?? anime.cover);
          const score = formatScore(anime.score);
          const genres = anime.genres.slice(0, 3).map(genreLabel);
          return (
            <li key={anime.id} className="featured__slide" aria-label={`${index + 1} dari ${items.length}`}>
              {image ? (
                <img
                  className="featured__img"
                  src={image}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className="featured__plate">
                <p className="featured__title">{title}</p>
                <p className="featured__meta">
                  {anime.format ? <span>{FORMAT_LABEL[anime.format]}</span> : null}
                  {score ? (
                    <span className="featured__score">
                      <Star aria-hidden="true" />
                      <span className="visually-hidden">Skor </span>
                      {score}
                    </span>
                  ) : null}
                  {genres.length > 0 ? <span>{genres.join(', ')}</span> : null}
                </p>
                <ButtonLink to={`/anime/${anime.id}`} variant="primary" size="sm" aria-label={`Lihat detail ${title}`}>
                  Lihat detail
                </ButtonLink>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
