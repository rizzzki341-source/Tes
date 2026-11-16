import type { ReactNode } from 'react';
import { safeHttpsUrl } from '../lib/sources';

export interface ExternalLinkProps {
  /** Must be an https URL; anything else renders the children as plain text. */
  href: string;
  children: ReactNode;
  className?: string;
}

/** Text link to another site: new tab, `rel="noopener noreferrer"`, https only. */
export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  const safe = safeHttpsUrl(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a href={safe} className={['link', className ?? ''].filter(Boolean).join(' ')} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (tab baru)</span>
    </a>
  );
}
