import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Poster } from './Poster';

export interface ListRowProps {
  /** Where the title links to, e.g. `/anime/21`. */
  to: string;
  title: string;
  cover: string | null;
  coverSmall?: string | null;
  /** Second line, e.g. "Episode 5 · 2 jam lalu". */
  secondary?: ReactNode;
  /** Right side, e.g. progress "12/24" or a remove IconButton. */
  trailing?: ReactNode;
}

/** Poster thumb + title + secondary line + trailing slot. Renders an `<li>`; put it in `<ul className="rows">`. */
export function ListRow({ to, title, cover, coverSmall, secondary, trailing }: ListRowProps) {
  return (
    <li className="row">
      <Poster cover={cover} coverSmall={coverSmall} title={title} size="thumb" decorative />
      <div className="row__body">
        <Link to={to} className="row__title">
          {title}
        </Link>
        {secondary ? <div className="row__meta">{secondary}</div> : null}
      </div>
      {trailing ? <div className="row__trailing">{trailing}</div> : null}
    </li>
  );
}
