import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Bell, History, ListChecks, Trash, X } from 'lucide-react';
import {
  AnimeCard,
  Button,
  ButtonLink,
  Chip,
  ConfirmDialog,
  IconButton,
  ListRow,
  StateBlock,
  TabPanel,
  Tabs,
  toast,
  type TabItem,
} from '../components';
import { useDocumentTitle, useNow, useTitle } from '../hooks';
import type { TrackingData } from '../lib/anilist/types';
import { LIST_LABEL, STATUS_LABEL } from '../lib/catalog';
import { useTracking } from '../lib/query';
import { formatClock, formatCountdown } from '../lib/time';
import { useLibrary, type HistoryItem, type LibraryEntry } from '../store/library';
import {
  LIST_FILTERS,
  groupHistory,
  libraryTotals,
  libraryUrlParams,
  listEntries,
  nextEpisode,
  parseListFilter,
  parseTab,
  progressLabel,
  subscribedEntries,
  type LibraryTab,
  type ListFilter,
} from './library.helpers';
import './library.css';

const ID_BASE = 'koleksi';
const TAB_ITEMS: TabItem<LibraryTab>[] = [
  { id: 'langganan', label: 'Langganan' },
  { id: 'daftar', label: 'Daftar' },
  { id: 'riwayat', label: 'Riwayat' },
];

const filterLabel = (filter: ListFilter) => (filter === 'all' ? 'Semua' : LIST_LABEL[filter]);

/** A removed row takes the focus with it; the panel is the nearest thing that is still there. */
function focusPanel(tab: LibraryTab) {
  document.getElementById(`${ID_BASE}-panel-${tab}`)?.focus();
}

// C06
export default function Library() {
  useDocumentTitle('Koleksi');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const filter = parseListFilter(searchParams.get('status'));
  const entries = useLibrary((state) => state.entries);
  const totals = useMemo(() => libraryTotals(entries), [entries]);

  const go = (nextTab: LibraryTab, nextFilter: ListFilter = 'all') =>
    setSearchParams(libraryUrlParams(nextTab, nextFilter), { replace: true });

  return (
    <div className="page">
      <p className="library-totals">
        {totals.titles} judul · {totals.episodes} episode ditonton
      </p>
      <div>
        <Tabs idBase={ID_BASE} label="Bagian koleksi" items={TAB_ITEMS} value={tab} onChange={(next) => go(next)} />
        <TabPanel idBase={ID_BASE} id={tab} className="library-panel">
          {tab === 'langganan' ? <Subscriptions entries={entries} /> : null}
          {tab === 'daftar' ? <Lists entries={entries} filter={filter} onFilter={(next) => go('daftar', next)} /> : null}
          {tab === 'riwayat' ? <HistoryList entries={entries} /> : null}
        </TabPanel>
      </div>
    </div>
  );
}

function subscriptionNote(entry: LibraryEntry, tracking: TrackingData | undefined, nowMs: number): string | undefined {
  const next = nextEpisode(entry.id, tracking, nowMs);
  if (next) return `Ep ${next.episode} · ${formatCountdown(next.atMs, nowMs)}`;
  const status = tracking?.anime.find((anime) => anime.id === entry.id)?.status ?? entry.snapshot.status;
  return status ? STATUS_LABEL[status] : undefined;
}

function Subscriptions({ entries }: { entries: Record<string, LibraryEntry> }) {
  const now = useNow();
  const title = useTitle();
  const tracking = useTracking();
  const toggleSubscribe = useLibrary((state) => state.toggleSubscribe);
  const subscribed = useMemo(() => subscribedEntries(entries), [entries]);

  if (subscribed.length === 0) {
    return (
      <StateBlock
        variant="empty"
        icon={<Bell />}
        title="Belum ada langganan"
        body="Langganan judul yang kamu ikuti. Episode barunya nanti muncul di sini dan di Notifikasi."
        action={
          <>
            <ButtonLink to="/jadwal" variant="primary">
              Lihat jadwal tayang
            </ButtonLink>
            <ButtonLink to="/cari">Cari anime</ButtonLink>
          </>
        }
      />
    );
  }

  const stop = (entry: LibraryEntry) => {
    const name = title(entry.snapshot.title);
    if (toggleSubscribe(entry.snapshot, Date.now())) return;
    toast(`Berhenti langganan ${name}`);
    focusPanel('langganan');
  };

  return (
    <div className="stack">
      {tracking.isError ? (
        <StateBlock variant="stale" onReload={() => void tracking.refetch()} reloading={tracking.isFetching} />
      ) : null}
      <ul className="card-grid library-subs">
        {subscribed.map((entry) => {
          const fresh = tracking.data?.anime.find((anime) => anime.id === entry.id);
          return (
            <li key={entry.id} className="library-subs__item">
              <AnimeCard
                anime={{ ...entry.snapshot, score: fresh?.score ?? null }}
                sublabel={subscriptionNote(entry, tracking.data, now)}
              />
              <Button size="sm" block aria-label={`Berhenti langganan ${title(entry.snapshot.title)}`} onClick={() => stop(entry)}>
                Berhenti langganan
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Lists({
  entries,
  filter,
  onFilter,
}: {
  entries: Record<string, LibraryEntry>;
  filter: ListFilter;
  onFilter: (filter: ListFilter) => void;
}) {
  const title = useTitle();
  const all = useMemo(() => listEntries(entries, 'all'), [entries]);
  const shown = useMemo(() => listEntries(entries, filter), [entries, filter]);

  if (all.length === 0) {
    return (
      <StateBlock
        variant="empty"
        icon={<ListChecks />}
        title="Daftarmu masih kosong"
        body="Simpan judul ke Ingin ditonton dari halaman detailnya. Progres episodenya ikut tercatat di sini."
        action={
          <ButtonLink to="/cari" variant="primary">
            Cari anime
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="stack">
      <div className="chip-row" role="group" aria-label="Saring daftar">
        {LIST_FILTERS.map((item) => (
          <Chip key={item} selected={item === filter} onClick={() => onFilter(item)}>
            {filterLabel(item)}
          </Chip>
        ))}
      </div>
      {shown.length === 0 ? (
        <StateBlock
          variant="empty"
          icon={<ListChecks />}
          title={`Belum ada judul di “${filterLabel(filter)}”`}
          body="Lihat daftar lain, atau cari judul baru untuk ditambahkan."
          action={
            <>
              <Button variant="primary" onClick={() => onFilter('all')}>
                Lihat semua
              </Button>
              <ButtonLink to="/cari">Cari anime</ButtonLink>
            </>
          }
        />
      ) : (
        <ul className="rows">
          {shown.map((entry) => {
            const progress = progressLabel(entry);
            return (
              <ListRow
                key={entry.id}
                to={`/anime/${entry.id}`}
                title={title(entry.snapshot.title)}
                cover={entry.snapshot.cover}
                coverSmall={entry.snapshot.coverSmall}
                secondary={entry.list ? LIST_LABEL[entry.list] : undefined}
                trailing={
                  <span className="library-progress">
                    <span aria-hidden="true">{progress.text}</span>
                    <span className="visually-hidden">{progress.spoken}</span>
                  </span>
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function HistoryList({ entries }: { entries: Record<string, LibraryEntry> }) {
  const now = useNow();
  const title = useTitle();
  const history = useLibrary((state) => state.history);
  const removeHistory = useLibrary((state) => state.removeHistory);
  const clearHistory = useLibrary((state) => state.clearHistory);
  const [asking, setAsking] = useState(false);
  const groups = useMemo(() => groupHistory(history, now), [history, now]);

  if (history.length === 0) {
    return (
      <StateBlock
        variant="empty"
        icon={<History />}
        title="Riwayat masih kosong"
        body="Tandai episode yang sudah kamu tonton di halaman detail anime. Catatannya muncul di sini."
        action={
          <>
            <ButtonLink to="/cari" variant="primary">
              Cari anime
            </ButtonLink>
            <ButtonLink to="/jadwal">Lihat jadwal tayang</ButtonLink>
          </>
        }
      />
    );
  }

  const nameOf = (item: HistoryItem) => {
    const entry = entries[String(item.mediaId)];
    return entry ? title(entry.snapshot.title) : `Anime #${item.mediaId}`;
  };

  const remove = (item: HistoryItem) => {
    removeHistory(item.key);
    toast('Dihapus dari riwayat');
    focusPanel('riwayat');
  };

  return (
    <div className="stack">
      <div className="library-history-head">
        <p className="muted text-sm">{history.length} catatan tontonan</p>
        <Button size="sm" variant="danger" icon={<Trash />} onClick={() => setAsking(true)}>
          Hapus riwayat
        </Button>
      </div>
      {groups.map((group) => (
        <section key={group.label} className="library-day" aria-label={group.label}>
          <h2 className="library-day__title">{group.label}</h2>
          <ul className="rows">
            {group.items.map((item) => {
              const name = nameOf(item);
              const snapshot = entries[String(item.mediaId)]?.snapshot;
              return (
                <ListRow
                  key={item.key}
                  to={`/anime/${item.mediaId}`}
                  title={name}
                  cover={snapshot?.cover ?? null}
                  coverSmall={snapshot?.coverSmall}
                  secondary={
                    <>
                      <span>Episode {item.episode}</span>
                      <time dateTime={new Date(item.at).toISOString()}>{formatClock(item.at)}</time>
                    </>
                  }
                  trailing={
                    <IconButton
                      label={`Hapus ${name} episode ${item.episode} dari riwayat`}
                      icon={<X />}
                      onClick={() => remove(item)}
                    />
                  }
                />
              );
            })}
          </ul>
        </section>
      ))}
      <ConfirmDialog
        open={asking}
        danger
        title="Hapus semua riwayat?"
        body="Catatan kapan kamu menonton akan hilang. Progres episode dan daftarmu tidak berubah."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          clearHistory();
          setAsking(false);
          toast('Riwayat dihapus');
        }}
        onCancel={() => setAsking(false)}
      />
    </div>
  );
}
