import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'aria-pressed' | 'children'> {
  /** Accessible name (required, there is no visible text). */
  label: string;
  icon: ReactNode;
  /** Makes this a toggle: sets aria-pressed. Keep `label` the same in both states. */
  pressed?: boolean;
}

export function IconButton({ label, icon, pressed, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={['icon-btn', className ?? ''].filter(Boolean).join(' ')}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <span className="icon-btn__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

export interface IconLinkProps {
  label: string;
  icon: ReactNode;
  to: string;
  /** Small counter on the corner; hidden when 0. Shows "9+" above 9. */
  badge?: number;
  /** Screen-reader text for the badge, e.g. "3 belum dibaca". */
  badgeLabel?: string;
  className?: string;
}

/** Same look as IconButton, but navigates to an in-app route. */
export function IconLink({ label, icon, to, badge = 0, badgeLabel, className }: IconLinkProps) {
  return (
    <Link to={to} className={['icon-btn', className ?? ''].filter(Boolean).join(' ')} aria-label={label} title={label}>
      <span className="icon-btn__icon" aria-hidden="true">
        {icon}
      </span>
      {badge > 0 ? (
        <span className="icon-btn__badge">
          <span aria-hidden="true">{badge > 9 ? '9+' : badge}</span>
          <span className="visually-hidden">{badgeLabel ?? String(badge)}</span>
        </span>
      ) : null}
    </Link>
  );
}
