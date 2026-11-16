import { Children, useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { SkeletonCard } from './StateBlock';

export interface RailProps {
  /** Section heading (h2). */
  title: string;
  /** Route of the "Lihat semua" link; omitted = no link. */
  seeAllTo?: string;
  /** Shows 6 skeleton cards instead of the children. */
  loading?: boolean;
  /** One element per item (usually `<AnimeCard layout="rail" />`); each is wrapped in an `<li>`. */
  children?: ReactNode;
  className?: string;
}

const SKELETONS = [0, 1, 2, 3, 4, 5];

/** Horizontally scrolling row with a heading. Renders nothing when it has no items and is not loading. */
export function Rail({ title, seeAllTo, loading = false, children, className }: RailProps) {
  const headingId = useId();
  const items = Children.toArray(children);
  if (!loading && items.length === 0) return null;

  return (
    <section className={['rail', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <div className="rail__head">
        <h2 id={headingId} className="rail__title">
          {title}
        </h2>
        {seeAllTo ? (
          <Link to={seeAllTo} className="rail__more">
            Lihat semua<span className="visually-hidden">: {title}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {loading ? (
        <ul className="rail__list" aria-busy="true" aria-label={`Memuat ${title}`}>
          {SKELETONS.map((n) => (
            <li key={n} className="rail__item">
              <SkeletonCard />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="rail__list">
          {items.map((child, index) => (
            <li key={(child as { key?: string | null }).key ?? index} className="rail__item">
              {child}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
