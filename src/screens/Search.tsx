import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { RotateCcw, Search as SearchIcon, SearchX, X } from 'lucide-react';
import { AnimeCard, Button, SelectField, SkeletonCard, StateBlock, TextField, errorMessage } from '../components';
import { useDocumentTitle } from '../hooks';
import { ANIME_FORMATS, ANIME_STATUSES, type Anime, type AnimeFormat, type AnimeStatus, type SortKey } from '../lib/anilist/types';
import { FORMAT_LABEL, GENRES, SORT_LABEL, STATUS_LABEL } from '../lib/catalog';
import { useSearch } from '../lib/query';
import {
  EMPTY_SEARCH,
  MAX_QUERY_LENGTH,
  cleanQuery,
  describeSearch,
  effectiveSort,
  isSearchActive,
  parseSearchUrl,
  seasonChipLabel,
  sortOptions,
  toSearchParams,
  toUrlParams,
  withQuery,
  withSort,
  yearOptions,
  type SearchUrlState,
} from './search.helpers';
import './search.css';

const DEBOUNCE_MS = 400;
const HEADING_ID = 'search-heading';

const GENRE_OPTIONS = [{ value: '', label: 'Semua genre' }, ...GENRES.map((g) => ({ value: g.id, label: g.label }))];
const FORMAT_OPTIONS: { value: AnimeFormat | ''; label: string }[] = [
  { value: '', label: 'Semua format' },
  ...ANIME_FORMATS.map((f) => ({ value: f, label: FORMAT_LABEL[f] })),
];
const STATUS_ORDER: AnimeStatus[] = ['RELEASING', 'NOT_YET_RELEASED', 'FINISHED', 'HIATUS', 'CANCELLED'];
const STATUS_OPTIONS: { value: AnimeStatus | ''; label: string }[] = [
  { value: '', label: 'Semua status' },
  ...STATUS_ORDER.filter((s) => ANIME_STATUSES.includes(s)).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

// C03
export default function Search() {
  useDocumentTitle('Cari');
  const [searchParams, setSearchParams] = useSearchParams();
  const [nowYear] = useState(() => new Date(Date.now()).getFullYear());
  const state = useMemo(() => parseSearchUrl(searchParams, nowYear), [searchParams, nowYear]);
  // What the URL holds, or is about to hold: a change made before the router has re-rendered still builds on it.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const apply = useCallback(
    (next: SearchUrlState) => {
      latest.current = next;
      setSearchParams(toUrlParams(next), { replace: true });
    },
    [setSearchParams],
  );

  // The box keeps its own text; the URL follows 400 ms after the last keystroke.
  const [text, setText] = useState(state.q);
  /** The query last written to, or read from, the URL. */
  const syncedQuery = useRef(state.q);
  const formRef = useRef<HTMLFormElement>(null);

  const commitQuery = useCallback(
    (value: string) => {
      const q = cleanQuery(value);
      if (q === syncedQuery.current) return;
      syncedQuery.current = q;
      apply(withQuery(latest.current, q));
    },
    [apply],
  );

  // A query that changed from outside (a link, back/forward) replaces the text in the box.
  useEffect(() => {
    if (state.q === syncedQuery.current) return;
    syncedQuery.current = state.q;
    setText(state.q);
  }, [state.q]);

  useEffect(() => {
    if (cleanQuery(text) === syncedQuery.current) return;
    const timer = setTimeout(() => commitQuery(text), text === '' ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, commitQuery]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitQuery(text);
  };

  const reset = () => {
    syncedQuery.current = '';
    setText('');
    apply(EMPTY_SEARCH);
    formRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  };

  const years = useMemo(
    () => [{ value: '', label: 'Semua tahun' }, ...yearOptions(nowYear).map((y) => ({ value: String(y), label: String(y) }))],
    [nowYear],
  );
  const sorts = sortOptions(state.q).map((s) => ({ value: s, label: SORT_LABEL[s] }));
  const seasonLabel = seasonChipLabel(state);
  const active = isSearchActive(state) || text.trim() !== '';

  return (
    <div className="page">
      <div className="search-controls">
        <form ref={formRef} role="search" className="search-form" onSubmit={onSubmit}>
          <TextField
            label="Cari anime"
            type="search"
            name="q"
            value={text}
            onChange={setText}
            placeholder="Judul anime, misalnya Frieren"
            clearable
            icon={<SearchIcon />}
            maxLength={MAX_QUERY_LENGTH}
            enterKeyHint="search"
            spellCheck={false}
          />
        </form>

        <div className="search-filters" role="group" aria-label="Filter">
          <SelectField
            label="Genre"
            value={state.genre ?? ''}
            options={GENRE_OPTIONS}
            onChange={(genre) => apply({ ...latest.current, genre: genre === '' ? null : genre })}
          />
          <SelectField<AnimeFormat | ''>
            label="Format"
            value={state.format ?? ''}
            options={FORMAT_OPTIONS}
            onChange={(format) => apply({ ...latest.current, format: format === '' ? null : format })}
          />
          <SelectField<AnimeStatus | ''>
            label="Status"
            value={state.status ?? ''}
            options={STATUS_OPTIONS}
            onChange={(status) => apply({ ...latest.current, status: status === '' ? null : status })}
          />
          <SelectField
            label="Tahun"
            value={state.year === null ? '' : String(state.year)}
            options={years}
            onChange={(year) => apply({ ...latest.current, year: year === '' ? null : Number(year) })}
          />
          <SelectField<SortKey>
            label="Urutkan"
            className="search-filters__sort"
            value={effectiveSort(state)}
            options={sorts}
            onChange={(sort) => apply(withSort(latest.current, sort))}
          />
        </div>

        {seasonLabel || active ? (
          <div className="search-active">
            {seasonLabel ? (
              <Button
                size="sm"
                icon={<X />}
                aria-label={`Hapus filter ${seasonLabel}`}
                onClick={() => apply({ ...latest.current, season: null })}
              >
                {seasonLabel}
              </Button>
            ) : null}
            {active ? (
              <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={reset}>
                Reset filter
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <SearchResults state={state} onReset={reset} />
    </div>
  );
}

function SearchResults({ state, onReset }: { state: SearchUrlState; onReset: () => void }) {
  const params = useMemo(() => toSearchParams(state), [state]);
  const query = useSearch(params);
  const { data, hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const items = useMemo(() => {
    // Pages can shift between requests; a title that shows up twice is kept once.
    const seen = new Set<number>();
    const list: Anime[] = [];
    for (const page of data?.pages ?? []) {
      for (const anime of page.items) {
        if (seen.has(anime.id)) continue;
        seen.add(anime.id);
        list.push(anime);
      }
    }
    return list;
  }, [data]);

  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  // After a failed page only the button loads more, so a refused request is never repeated on its own.
  const autoLoad = hasNextPage && !isFetching && !query.isError;
  const sentinel = useRef<HTMLDivElement>(null);
  const pageCount = data?.pages.length ?? 0;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !autoLoad || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '0px 0px 160px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoLoad, loadMore, pageCount]);

  const heading = describeSearch(state);
  const filtered = isSearchActive(state);

  let body;
  if (query.isPending && query.fetchStatus === 'paused') {
    // Offline with nothing saved for this search: say so instead of a skeleton that never ends.
    body = <StateBlock variant="error" error={query.failureReason} onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    body = <StateBlock variant="loading" shape="grid" label="Sedang mencari" />;
  } else if (query.isError && !data) {
    body = <StateBlock variant="error" error={query.error} onRetry={() => void query.refetch()} retrying={isFetching} />;
  } else if (items.length === 0) {
    body = (
      <StateBlock
        variant="empty"
        icon={<SearchX />}
        title="Tidak ketemu"
        body={
          filtered
            ? 'Belum ada anime yang cocok. Coba ejaan lain, pakai judul Romaji atau Inggris, atau longgarkan filternya.'
            : 'Daftarnya lagi kosong. Coba muat ulang sebentar lagi.'
        }
        action={
          filtered ? (
            <Button variant="primary" icon={<RotateCcw />} onClick={onReset}>
              Reset filter
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void query.refetch()}>
              Muat ulang
            </Button>
          )
        }
      />
    );
  } else {
    body = (
      <>
        {query.isError && !isFetchNextPageError ? (
          <StateBlock variant="stale" onReload={() => void query.refetch()} reloading={isFetching} />
        ) : null}
        <ul className="card-grid search-grid">
          {items.map((anime, index) => (
            <li key={anime.id} className="search-grid__item">
              <AnimeCard anime={anime} eager={index < 6} />
            </li>
          ))}
          {isFetchingNextPage
            ? [0, 1, 2, 3, 4, 5].map((n) => (
                <li key={`skeleton-${n}`} className="search-grid__item">
                  <SkeletonCard />
                </li>
              ))
            : null}
        </ul>
        <div className="search-more">
          <p className="visually-hidden" role="status">
            {isFetchingNextPage ? 'Memuat judul berikutnya' : `${items.length} judul dimuat`}
          </p>
          {isFetchNextPageError ? (
            <p className="search-more__error" role="alert">
              {errorMessage(query.error)}
            </p>
          ) : null}
          {hasNextPage ? (
            <>
              <div ref={sentinel} className="search-more__sentinel" aria-hidden="true" />
              <Button onClick={loadMore} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Memuat…' : 'Muat lagi'}
              </Button>
            </>
          ) : (
            <p className="muted text-sm">Sudah sampai ujung daftar.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <section className="search-results" aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className="section-title">
        {heading}
      </h2>
      {body}
    </section>
  );
}
