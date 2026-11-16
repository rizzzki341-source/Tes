import { useEffect, useState } from 'react';
import { safeHttpsUrl } from '../lib/sources';
import { useLibrary } from '../store/library';

export interface PosterProps {
  /** Large cover (Anime.cover). */
  cover: string | null;
  /** Small cover (Anime.coverSmall); used when "Hemat data" is on. */
  coverSmall?: string | null;
  /** Anime title: the alt text and the source of the fallback initial. */
  title: string;
  /** Set when the title is printed right next to the poster; the image then gets an empty alt. */
  decorative?: boolean;
  /** `fluid` fills the container width, `thumb` is the small row size, `lg` the detail size. */
  size?: 'fluid' | 'thumb' | 'lg';
  /** Load immediately instead of lazily (first screenful only). */
  eager?: boolean;
  className?: string;
}

function initialOf(title: string): string {
  const first = Array.from(title.trim())[0];
  return first ? first.toLocaleUpperCase('id') : '?';
}

/** 2:3 cover image with a placeholder and a title-initial fallback. */
export function Poster({ cover, coverSmall, title, decorative = false, size = 'fluid', eager = false, className }: PosterProps) {
  const dataSaver = useLibrary((state) => state.settings.dataSaver);
  const src = safeHttpsUrl(dataSaver || size === 'thumb' ? (coverSmall ?? cover) : (cover ?? coverSmall));
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => setFailedSrc(null), [src]);

  const showImage = src !== null && failedSrc !== src;
  return (
    <div className={['poster', `poster--${size}`, className ?? ''].filter(Boolean).join(' ')}>
      {showImage ? (
        <img
          className="poster__img"
          src={src}
          alt={decorative ? '' : title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="poster__fallback" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : title} aria-hidden={decorative ? true : undefined}>
          {initialOf(title)}
        </span>
      )}
    </div>
  );
}
