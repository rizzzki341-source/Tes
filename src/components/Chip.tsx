import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  /** Filter state, exposed as aria-pressed. */
  selected: boolean;
  children: ReactNode;
}

/** Filter chip: a toggle button. */
export function Chip({ selected, className, type = 'button', children, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      className={['chip', 'chip--action', className ?? ''].filter(Boolean).join(' ')}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}

export interface ChipLinkProps {
  /** In-app route, e.g. `/cari?genre=Action`. */
  to: string;
  children: ReactNode;
  className?: string;
}

export function ChipLink({ to, className, children }: ChipLinkProps) {
  return (
    <Link to={to} className={['chip', 'chip--action', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </Link>
  );
}

export type ChipTone = 'neutral' | 'accent' | 'warning';

export interface StatusChipProps {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}

/** Static label, not interactive. */
export function StatusChip({ tone = 'neutral', className, children }: StatusChipProps) {
  return <span className={['chip', `chip--${tone}`, className ?? ''].filter(Boolean).join(' ')}>{children}</span>;
}
