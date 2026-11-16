import { useNow } from '../hooks/useNow';
import { formatCountdown } from '../lib/time';

export interface CountdownProps {
  /** When the episode airs (unix ms). */
  targetMs: number;
  /** Pass the parent's clock to share one ticker across a list; omitted = ticks by itself every 30 s. */
  nowMs?: number;
  /** Text shown once the target has passed. */
  doneLabel?: string;
  className?: string;
}

function Text({ targetMs, nowMs, doneLabel, className }: Required<Pick<CountdownProps, 'targetMs' | 'nowMs' | 'doneLabel'>> & { className?: string }) {
  return (
    <time className={className} dateTime={new Date(targetMs).toISOString()}>
      {targetMs <= nowMs ? doneLabel : formatCountdown(targetMs, nowMs)}
    </time>
  );
}

function Ticking({ targetMs, doneLabel, className }: { targetMs: number; doneLabel: string; className?: string }) {
  const now = useNow(30_000);
  return <Text targetMs={targetMs} nowMs={now} doneLabel={doneLabel} className={className} />;
}

/** Time left until `targetMs`, e.g. "2 hr 4 j". */
export function Countdown({ targetMs, nowMs, doneLabel = 'Sudah tayang', className }: CountdownProps) {
  if (nowMs === undefined) return <Ticking targetMs={targetMs} doneLabel={doneLabel} className={className} />;
  return <Text targetMs={targetMs} nowMs={nowMs} doneLabel={doneLabel} className={className} />;
}
