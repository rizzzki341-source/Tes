import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { BellOff, CalendarX, RefreshCw, WifiOff } from 'lucide-react';
import { AiringRow, Button, StateBlock, Switch, TabPanel, Tabs, toast } from '../components';
import { useDocumentTitle, useNow, useTitle } from '../hooks';
import type { Anime } from '../lib/anilist/types';
import { ensureAlertPermission } from '../lib/notifications';
import { useScheduleDay } from '../lib/query';
import { addDays, dayTabLabel, formatDateLong, startOfLocalDay } from '../lib/time';
import { subscribedIds, useLibrary } from '../store/library';
import { SCHEDULE_DAYS, deviceTimeZone, episodeCountLabel, isFinale, parseDayIndex, sortAirings } from './schedule.helpers';
import './schedule.css';

const TAB_BASE = 'jadwal';
const DAY_PARAM = 'hari';
const FILTER_PARAM = 'langganan';

// C02 Jadwal tayang
export default function Schedule() {
  useDocumentTitle('Jadwal tayang');
  const now = useNow();
  const pickTitle = useTitle();
  const [params, setParams] = useSearchParams();

  const today = startOfLocalDay(now);
  const days = useMemo(() => Array.from({ length: SCHEDULE_DAYS }, (_, index) => addDays(today, index)), [today]);
  const dayIndex = parseDayIndex(params.get(DAY_PARAM));
  const dayStart = days[dayIndex] ?? today;
  const onlySubscribed = params.get(FILTER_PARAM) === '1';

  const query = useScheduleDay(dayStart);
  const entries = useLibrary((state) => state.entries);
  const alertsOn = useLibrary((state) => state.settings.alerts);
  const toggleSubscribe = useLibrary((state) => state.toggleSubscribe);

  const subscribed = useMemo(() => new Set(subscribedIds(entries)), [entries]);
  const all = useMemo(() => sortAirings(query.data ?? []), [query.data]);
  const shown = onlySubscribed ? all.filter((item) => subscribed.has(item.anime.id)) : all;
  const zone = useMemo(deviceTimeZone, []);

  const patchParams = (key: string, value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };
  const setFilter = (on: boolean) => patchParams(FILTER_PARAM, on ? '1' : null);

  const onToggle = (anime: Anime) => {
    const name = pickTitle(anime.title);
    const on = toggleSubscribe(anime, Date.now());
    toast(on ? `Masuk langganan: ${name}` : `Berhenti langganan: ${name}`);
    if (!on || !alertsOn) return;
    void ensureAlertPermission().then((result) => {
      if (result === 'denied') toast('Langganan tersimpan, tapi izin notifikasi belum aktif.');
    });
  };

  const tabs = days.map((day, index) => ({ id: String(index), label: dayTabLabel(day, now) }));
  const isToday = dayIndex === 0;
  const reload = () => void query.refetch();
  // Offline with nothing cached leaves the query paused: that is not "loading".
  const waitingForNetwork = !query.data && query.fetchStatus === 'paused';

  let body;
  if (waitingForNetwork) {
    body = (
      <StateBlock
        variant="empty"
        icon={<WifiOff />}
        title="Lagi offline"
        body="Jadwal hari ini belum tersimpan di perangkat. Sambungkan internet dulu, lalu coba lagi."
        action={
          <Button variant="primary" icon={<RefreshCw />} onClick={reload}>
            Coba lagi
          </Button>
        }
      />
    );
  } else if (query.isPending) {
    body = <StateBlock variant="loading" shape="rows" label="Sedang memuat jadwal" />;
  } else if (query.isError && !query.data) {
    body = <StateBlock variant="error" error={query.error} onRetry={reload} retrying={query.isFetching} />;
  } else if (all.length === 0) {
    body = (
      <StateBlock
        variant="empty"
        icon={<CalendarX />}
        title={isToday ? 'Belum ada jadwal hari ini' : 'Belum ada jadwal di hari ini'}
        body="Tidak ada episode yang tercatat tayang pada tanggal ini. Coba cek hari lain."
      />
    );
  } else if (shown.length === 0) {
    body = (
      <StateBlock
        variant="empty"
        icon={<BellOff />}
        title="Langgananmu tidak ada yang tayang"
        body={`Ada ${all.length} episode lain di tanggal ini. Matikan saringan untuk melihat semuanya.`}
        action={<Button onClick={() => setFilter(false)}>Tampilkan semua</Button>}
      />
    );
  } else {
    body = (
      <ul className="rows">
        {shown.map((item) => (
          <AiringRow
            key={item.id}
            mediaId={item.anime.id}
            title={item.anime.title}
            cover={item.anime.cover}
            coverSmall={item.anime.coverSmall}
            episode={item.episode}
            atMs={item.airingAt * 1000}
            nowMs={now}
            finale={isFinale(item)}
            subscribed={subscribed.has(item.anime.id)}
            onToggleSubscribe={() => onToggle(item.anime)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="page schedule">
      <Tabs
        idBase={TAB_BASE}
        label="Pilih hari"
        items={tabs}
        value={String(dayIndex)}
        onChange={(id) => patchParams(DAY_PARAM, id)}
        scrollable
      />
      <TabPanel idBase={TAB_BASE} id={String(dayIndex)} className="schedule-panel">
        <div className="schedule-head">
          <div className="schedule-head__text">
            <h2 className="section-title">{formatDateLong(dayStart)}</h2>
            {query.data ? (
              <p className="muted text-sm">{episodeCountLabel(shown.length, all.length, onlySubscribed)}</p>
            ) : null}
          </div>
          <Switch className="schedule-filter" label="Hanya langganan" checked={onlySubscribed} onChange={setFilter} />
        </div>

        {query.data && query.isError ? <StateBlock variant="stale" onReload={reload} reloading={query.isFetching} /> : null}

        {body}

        <p className="schedule-zone muted text-sm">
          {zone ? `Jam mengikuti zona waktu perangkatmu (${zone}).` : 'Jam mengikuti zona waktu perangkatmu.'}
        </p>
      </TabPanel>
    </div>
  );
}
