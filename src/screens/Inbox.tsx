import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BellOff, BellRing, CheckCheck, RefreshCw, WifiOff } from 'lucide-react';
import { AiringRow, Button, ButtonLink, Countdown, ListRow, StateBlock, StatusChip, toast } from '../components';
import { useDocumentTitle, useNow } from '../hooks';
import { buildInbox, ensureAlertPermission, planAlerts } from '../lib/notifications';
import { isNative } from '../lib/platform';
import { useTracking } from '../lib/query';
import { useLibrary } from '../store/library';
import { UPCOMING_LIMIT, alertWhenLabel, checkAlertPermission, countUnread, isUnread } from './inbox.helpers';
import './inbox.css';

type Permission = 'unknown' | 'unsupported' | 'granted' | 'denied';

/** Notification permission on Android; re-checked when the app comes back from the system settings. */
function useAlertPermission(native: boolean): [Permission, (next: Permission) => void] {
  const [permission, setPermission] = useState<Permission>(native ? 'unknown' : 'unsupported');

  useEffect(() => {
    if (!native) return;
    let alive = true;
    const check = () => {
      void checkAlertPermission().then((result) => {
        if (alive) setPermission(result);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [native]);

  return [permission, setPermission];
}

// C07 Notifikasi
export default function Inbox() {
  useDocumentTitle('Notifikasi');
  const now = useNow();
  const query = useTracking();
  const entries = useLibrary((state) => state.entries);
  const alertsOn = useLibrary((state) => state.settings.alerts);
  const titleLang = useLibrary((state) => state.settings.titleLang);
  const markInboxRead = useLibrary((state) => state.markInboxRead);

  const native = isNative();
  const [permission, setPermission] = useAlertPermission(native);
  const [asking, setAsking] = useState(false);

  // The dots follow the read mark as it was when the screen opened, so they stay put during the visit.
  const [readAt, setReadAt] = useState(() => useLibrary.getState().inboxReadAt);

  const list = useMemo(() => Object.values(entries), [entries]);
  const subscribedCount = useMemo(() => list.filter((entry) => entry.subscribed).length, [list]);
  const data = subscribedCount > 0 ? query.data : undefined;
  const items = useMemo(() => (data ? buildInbox(list, data, now) : []), [data, list, now]);
  const upcoming = useMemo(
    () => (data ? planAlerts(list, data, now, titleLang, UPCOMING_LIMIT) : []),
    [data, list, now, titleLang],
  );
  const unread = countUnread(items, readAt);

  // Leaving the screen marks everything that was listed as read.
  const listed = useRef(false);
  listed.current = data !== undefined;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!listed.current) return;
      // Deferred so the unmount/remount that StrictMode simulates in development does not count as leaving.
      setTimeout(() => {
        if (!mounted.current) markInboxRead(Date.now());
      }, 0);
    };
  }, [markInboxRead]);

  const markAllRead = () => {
    const at = Date.now();
    markInboxRead(at);
    setReadAt(at);
    toast('Semua sudah ditandai dibaca');
  };

  const enableAlerts = async () => {
    setAsking(true);
    const result = await ensureAlertPermission();
    setAsking(false);
    if (result === 'unsupported') return;
    setPermission(result);
    toast(
      result === 'granted'
        ? 'Notifikasi aktif. Episode baru langsung dikabari.'
        : 'Izin belum diberikan. Buka pengaturan Android untuk aplikasi ini, lalu izinkan notifikasi.',
    );
  };

  const reload = () => void query.refetch();
  // Offline with nothing cached leaves the query paused: that is not "loading".
  const waitingForNetwork = subscribedCount > 0 && !data && query.fetchStatus === 'paused';

  let body;
  if (subscribedCount === 0) {
    body = (
      <StateBlock
        variant="empty"
        icon={<BellOff />}
        title="Belum ada langganan"
        body="Langganan dulu anime yang kamu ikuti. Setiap episode barunya tayang, kabarnya muncul di sini."
        action={
          <>
            <ButtonLink to="/jadwal" variant="primary">
              Lihat jadwal
            </ButtonLink>
            <ButtonLink to="/cari">Cari anime</ButtonLink>
          </>
        }
      />
    );
  } else if (waitingForNetwork) {
    body = (
      <StateBlock
        variant="empty"
        icon={<WifiOff />}
        title="Lagi offline"
        body="Kabar langgananmu belum tersimpan di perangkat. Sambungkan internet dulu, lalu coba lagi."
        action={
          <Button variant="primary" icon={<RefreshCw />} onClick={reload}>
            Coba lagi
          </Button>
        }
      />
    );
  } else if (!data && query.isError) {
    body = <StateBlock variant="error" error={query.error} onRetry={reload} retrying={query.isFetching} />;
  } else if (!data) {
    body = <StateBlock variant="loading" shape="rows" label="Sedang memuat notifikasi" />;
  } else {
    body = (
      <>
        {query.isError ? <StateBlock variant="stale" onReload={reload} reloading={query.isFetching} /> : null}

        <section className="inbox-section" aria-labelledby="inbox-aired-title">
          <div className="inbox-head">
            <h2 id="inbox-aired-title" className="section-title">
              Sudah tayang
            </h2>
            {items.length > 0 ? (
              <Button size="sm" variant="ghost" icon={<CheckCheck />} disabled={unread === 0} onClick={markAllRead}>
                Tandai semua dibaca
              </Button>
            ) : null}
          </div>
          {items.length > 0 ? (
            <>
              <p className="muted text-sm" role="status">
                {unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
              </p>
              <ul className="rows">
                {items.map((item) => (
                  <AiringRow
                    key={item.key}
                    mediaId={item.mediaId}
                    title={item.title}
                    cover={item.cover}
                    coverSmall={entries[String(item.mediaId)]?.snapshot.coverSmall}
                    episode={item.episode}
                    atMs={item.atMs}
                    nowMs={now}
                    timeMode="relative"
                    finale={item.finale}
                    unread={isUnread(item, readAt)}
                  />
                ))}
              </ul>
            </>
          ) : (
            <StateBlock
              variant="empty"
              title="Belum ada episode baru"
              body="Episode yang tayang setelah kamu langganan muncul di sini, sampai 30 hari ke belakang."
            />
          )}
        </section>

        {upcoming.length > 0 ? (
          <section className="inbox-section" aria-labelledby="inbox-upcoming-title">
            <h2 id="inbox-upcoming-title" className="section-title">
              Akan datang
            </h2>
            <ul className="rows">
              {upcoming.map((alert) => {
                const snapshot = entries[String(alert.mediaId)]?.snapshot;
                return (
                  <ListRow
                    key={alert.id}
                    to={`/anime/${alert.mediaId}`}
                    title={alert.title}
                    cover={snapshot?.cover ?? null}
                    coverSmall={snapshot?.coverSmall}
                    secondary={
                      <>
                        <span>
                          Episode {alert.episode} · {alertWhenLabel(alert.atMs, now)}
                        </span>
                        {alert.finale ? <StatusChip tone="warning">Episode terakhir</StatusChip> : null}
                      </>
                    }
                    trailing={
                      <StatusChip tone="accent">
                        <span className="visually-hidden">Tayang dalam </span>
                        <Countdown targetMs={alert.atMs} nowMs={now} />
                      </StatusChip>
                    }
                  />
                );
              })}
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <div className="page inbox">
      {!native ? (
        <p className="inbox-note muted text-sm">
          Pengingat berbunyi di aplikasi Android. Kotak notifikasi ini tetap jalan di mana saja.
        </p>
      ) : !alertsOn ? (
        <p className="inbox-note muted text-sm">
          Pengingat episode lagi dimatikan. Nyalakan lagi di{' '}
          <Link className="link" to="/pengaturan">
            Pengaturan
          </Link>
          .
        </p>
      ) : permission === 'denied' ? (
        <section className="inbox-permission" aria-labelledby="inbox-permission-title">
          <div className="inbox-permission__text">
            <h2 id="inbox-permission-title" className="inbox-permission__title">
              Notifikasi belum diizinkan
            </h2>
            <p className="muted text-sm">Tanpa izin, kabar episode baru tidak bisa muncul di HP kamu.</p>
          </div>
          <Button variant="primary" icon={<BellRing />} disabled={asking} onClick={() => void enableAlerts()}>
            Aktifkan notifikasi
          </Button>
        </section>
      ) : null}

      {body}
    </div>
  );
}
