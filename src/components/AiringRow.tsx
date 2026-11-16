import { Link } from 'react-router';
import { Bell, BellRing } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import type { TitleSet } from '../lib/anilist/types';
import { formatClock, relativeTime } from '../lib/time';
import { StatusChip } from './Chip';
import { Countdown } from './Countdown';
import { IconButton } from './IconButton';
import { Poster } from './Poster';

export interface AiringRowProps {
  mediaId: number;
  title: TitleSet;
  cover: string | null;
  coverSmall?: string | null;
  episode: number;
  /** Air time in unix ms (`airingAt * 1000`). */
  atMs: number;
  /** The list's shared clock, from `useNow()`. */
  nowMs: number;
  /** Time column: wall clock ("21.30", schedule) or relative ("2 jam lalu", inbox). */
  timeMode?: 'clock' | 'relative';
  /** Marks the last episode of the show. */
  finale?: boolean;
  /** Shows the unread dot (inbox). */
  unread?: boolean;
  /** Subscription state; leave both subscribe props out to hide the button. */
  subscribed?: boolean;
  onToggleSubscribe?: () => void;
}

/** One airing: time, poster, title, episode and state. Renders an `<li>`; put it in `<ul className="rows">`. */
export function AiringRow({
  mediaId,
  title,
  cover,
  coverSmall,
  episode,
  atMs,
  nowMs,
  timeMode = 'clock',
  finale = false,
  unread = false,
  subscribed,
  onToggleSubscribe,
}: AiringRowProps) {
  const name = useTitle()(title);
  const aired = atMs <= nowMs;
  return (
    <li className={unread ? 'row row--unread' : 'row'}>
      <time className={timeMode === 'clock' ? 'row__time' : 'row__time row__time--relative'} dateTime={new Date(atMs).toISOString()}>
        {timeMode === 'clock' ? formatClock(atMs) : relativeTime(atMs, nowMs)}
      </time>
      <Poster cover={cover} coverSmall={coverSmall} title={name} size="thumb" decorative />
      <div className="row__body">
        <Link to={`/anime/${mediaId}`} className="row__title">
          {unread ? <span className="visually-hidden">Belum dibaca: </span> : null}
          {name}
        </Link>
        <div className="row__meta">
          <span>Episode {episode}</span>
          {finale ? <StatusChip tone="warning">Episode terakhir</StatusChip> : null}
          {aired ? (
            <StatusChip>Sudah tayang</StatusChip>
          ) : (
            <StatusChip tone="accent">
              <span className="visually-hidden">Tayang dalam </span>
              <Countdown targetMs={atMs} nowMs={nowMs} />
            </StatusChip>
          )}
        </div>
      </div>
      {onToggleSubscribe ? (
        <IconButton
          className="row__action"
          label={`Langganan ${name}`}
          pressed={subscribed === true}
          icon={subscribed ? <BellRing /> : <Bell />}
          onClick={onToggleSubscribe}
        />
      ) : null}
    </li>
  );
}
