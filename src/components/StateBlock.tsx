import type { ReactNode } from 'react';
import { CircleExclamationPoint, CloudOff, Inbox, RefreshCw } from 'lucide-react';
import { ApiError, type ApiErrorKind } from '../lib/anilist/client';
import { Button } from './Button';

export const ERROR_COPY: Record<ApiErrorKind, string> = {
  network: 'Tidak ada koneksi. Yang tersimpan tetap bisa dibuka.',
  'rate-limit': 'Server data lagi ramai. Coba lagi sebentar lagi.',
  server: 'Sumber data sedang bermasalah.',
  'not-found': 'Anime ini tidak ditemukan.',
  graphql: 'Datanya tidak terbaca.',
};

const UNKNOWN_ERROR = 'Ada yang tidak beres. Coba lagi ya.';

/** User-facing message for anything a query can throw. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? ERROR_COPY[error.kind] : UNKNOWN_ERROR;
}

export type SkeletonShape = 'rail' | 'grid' | 'rows' | 'detail';

export type StateBlockProps =
  | {
      variant: 'loading';
      /** Which layout the skeleton imitates. Default 'rows'. */
      shape?: SkeletonShape;
      /** Screen-reader text. Default "Sedang memuat". */
      label?: string;
    }
  | {
      variant: 'empty';
      title: string;
      body?: ReactNode;
      /** Replaces the default icon. */
      icon?: ReactNode;
      /** A Button or ButtonLink. */
      action?: ReactNode;
    }
  | {
      variant: 'error';
      /** The query error; the message is chosen from `ApiError.kind`. */
      error: unknown;
      /** Shows "Coba lagi". Left out for errors a retry cannot fix (not-found). */
      onRetry?: () => void;
      /** Disables the button while the retry is running. */
      retrying?: boolean;
    }
  | {
      variant: 'stale';
      /** "Muat ulang". */
      onReload: () => void;
      reloading?: boolean;
    };

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--poster" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <div className="skeleton skeleton--thumb" />
      <div className="skeleton-row__text">
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </div>
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Skeleton({ shape }: { shape: SkeletonShape }) {
  if (shape === 'rail') {
    return (
      <div className="skeleton-rail">
        {range(6).map((n) => (
          <SkeletonCard key={n} />
        ))}
      </div>
    );
  }
  if (shape === 'grid') {
    return (
      <div className="card-grid">
        {range(12).map((n) => (
          <SkeletonCard key={n} />
        ))}
      </div>
    );
  }
  if (shape === 'detail') {
    return (
      <div className="skeleton-detail" aria-hidden="true">
        <div className="skeleton skeleton--banner" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </div>
    );
  }
  return (
    <div className="skeleton-rows">
      {range(6).map((n) => (
        <SkeletonRow key={n} />
      ))}
    </div>
  );
}

/** The loading, empty, error and "showing saved data" states every screen shares. */
export function StateBlock(props: StateBlockProps) {
  if (props.variant === 'loading') {
    return (
      <div className="state state--loading" role="status" aria-busy="true">
        <span className="visually-hidden">{props.label ?? 'Sedang memuat'}</span>
        <Skeleton shape={props.shape ?? 'rows'} />
      </div>
    );
  }

  if (props.variant === 'empty') {
    return (
      <div className="state state--empty">
        <span className="state__icon" aria-hidden="true">
          {props.icon ?? <Inbox />}
        </span>
        <p className="state__title">{props.title}</p>
        {props.body ? <div className="state__body">{props.body}</div> : null}
        {props.action ? <div className="state__action">{props.action}</div> : null}
      </div>
    );
  }

  if (props.variant === 'error') {
    return (
      <div className="state state--error" role="alert">
        <span className="state__icon" aria-hidden="true">
          <CircleExclamationPoint />
        </span>
        <p className="state__title">{errorMessage(props.error)}</p>
        {props.onRetry ? (
          <div className="state__action">
            <Button variant="primary" icon={<RefreshCw />} disabled={props.retrying} onClick={props.onRetry}>
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="state-stale" role="status">
      <span className="state-stale__text">
        <CloudOff aria-hidden="true" />
        Menampilkan data tersimpan
      </span>
      <Button size="sm" variant="ghost" disabled={props.reloading} onClick={props.onReload}>
        Muat ulang
      </Button>
    </div>
  );
}
