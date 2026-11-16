import { useId, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from './Button';
import { SelectField } from './Fields';

export interface EpisodeTrackerProps {
  /** How many episodes to list. 0 = not known yet. See `episodeCount()`. */
  count: number;
  /** Watched episode numbers (LibraryEntry.watched). */
  watched: number[];
  onToggle: (episode: number, watched: boolean) => void;
  /** "Tandai sampai sini": mark 1..episode, where `episode` is the last one tapped. */
  onMarkThrough: (episode: number) => void;
  /** "Hapus progres". */
  onClear: () => void;
}

const RANGE = 100;

/**
 * Episodes worth listing for a title: the announced total, else what has aired so far
 * (next episode - 1), and never less than the highest watched one.
 */
export function episodeCount(
  anime: { episodes: number | null; nextAiring?: { episode: number } | null },
  watched: number[] = [],
): number {
  const known = anime.episodes ?? (anime.nextAiring ? anime.nextAiring.episode - 1 : 0);
  return Math.max(0, known, ...watched);
}

export function EpisodeTracker({ count, watched, onToggle, onMarkThrough, onClear }: EpisodeTrackerProps) {
  const statusId = useId();
  const [range, setRange] = useState(0);
  const [lastTapped, setLastTapped] = useState<number | null>(null);
  const watchedSet = useMemo(() => new Set(watched), [watched]);

  if (count <= 0) {
    return <p className="tracker__note">Jumlah episodenya belum diumumkan. Begitu ada, daftarnya muncul di sini.</p>;
  }

  const ranges = Math.ceil(count / RANGE);
  const current = Math.min(range, ranges - 1);
  const first = current * RANGE + 1;
  const last = Math.min(count, first + RANGE - 1);
  const episodes = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const done = watched.filter((n) => n <= count).length;
  const complete = done >= count;

  return (
    <div className="tracker">
      <p id={statusId} className="tracker__status">
        {complete ? `Semua ${count} episode sudah ditonton.` : `${done} dari ${count} episode sudah ditonton.`}
      </p>
      {ranges > 1 ? (
        <SelectField
          label="Rentang episode"
          className="tracker__range"
          value={String(current)}
          onChange={(value) => setRange(Number(value))}
          options={Array.from({ length: ranges }, (_, i) => ({
            value: String(i),
            label: `Episode ${i * RANGE + 1}–${Math.min(count, (i + 1) * RANGE)}`,
          }))}
        />
      ) : null}
      <ul className="tracker__grid" aria-describedby={statusId}>
        {episodes.map((episode) => {
          const isWatched = watchedSet.has(episode);
          return (
            <li key={episode}>
              <button
                type="button"
                className="tracker__ep"
                aria-pressed={isWatched}
                aria-label={`Episode ${episode}, ${isWatched ? 'sudah ditonton' : 'belum ditonton'}`}
                onClick={() => {
                  setLastTapped(episode);
                  onToggle(episode, !isWatched);
                }}
              >
                {isWatched ? <Check aria-hidden="true" /> : null}
                <span aria-hidden="true">{episode}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="tracker__actions">
        <Button
          size="sm"
          disabled={lastTapped === null}
          onClick={() => {
            if (lastTapped !== null) onMarkThrough(lastTapped);
          }}
        >
          {lastTapped === null ? 'Tandai sampai sini' : `Tandai sampai sini (Ep ${lastTapped})`}
        </Button>
        <Button size="sm" variant="ghost" disabled={watched.length === 0} onClick={onClear}>
          Hapus progres
        </Button>
      </div>
      {lastTapped === null ? (
        <p className="field__hint">Ketuk satu episode dulu, lalu "Tandai sampai sini" menandai semua episode sebelumnya.</p>
      ) : null}
    </div>
  );
}
