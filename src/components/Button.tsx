import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { safeHttpsUrl } from '../lib/sources';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon element shown before the label (aria-hidden is added for you). */
  icon?: ReactNode;
  /** Stretch to the width of the container. */
  block?: boolean;
}

export interface ButtonProps extends ButtonLook, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  /** Makes this a toggle: sets aria-pressed. Keep the label the same in both states. */
  pressed?: boolean;
}

export function buttonClass({ variant = 'secondary', size = 'md', block = false }: ButtonLook, extra?: string): string {
  return ['btn', `btn--${variant}`, `btn--${size}`, block ? 'btn--block' : '', extra ?? ''].filter(Boolean).join(' ');
}

function Content({ icon, children }: { icon?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {icon ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="btn__label">{children}</span>
    </>
  );
}

export function Button({ variant, size, icon, block, pressed, className, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} className={buttonClass({ variant, size, block }, className)} aria-pressed={pressed}>
      <Content icon={icon}>{children}</Content>
    </button>
  );
}

export type ButtonLinkProps = ButtonLook & {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
} & ({ to: string; href?: never } | { href: string; to?: never });

/** A link that looks like a button. `to` = in-app route, `href` = external https page (opens in a new tab). */
export function ButtonLink({ variant, size, icon, block, className, children, ...rest }: ButtonLinkProps) {
  const classes = buttonClass({ variant, size, block }, className);
  if (rest.to !== undefined) {
    return (
      <Link to={rest.to} className={classes} aria-label={rest['aria-label']}>
        <Content icon={icon}>{children}</Content>
      </Link>
    );
  }
  const href = safeHttpsUrl(rest.href);
  if (!href) return null;
  return (
    <a href={href} className={classes} target="_blank" rel="noopener noreferrer" aria-label={rest['aria-label']}>
      <Content icon={icon}>{children}</Content>
    </a>
  );
}
