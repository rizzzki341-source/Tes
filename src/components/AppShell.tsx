import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router';
import { useAlertsSync } from '../hooks/useAlertsSync';
import { useShellTitle } from '../hooks/useDocumentTitle';
import { useInbox } from '../hooks/useInbox';
import { ROOT_PATHS, initNative } from '../lib/native';
import { ErrorBoundary } from './ErrorBoundary';
import { BottomNav, SideNav } from './MainNav';
import { StateBlock } from './StateBlock';
import { ToastHost } from './Toast';
import { TopBar, TopBarActionsSlot } from './TopBar';

/** Heading shown until the screen itself reports a title (while its code or data is loading). */
function fallbackTitle(pathname: string): string {
  if (pathname === '/') return 'Beranda';
  if (pathname === '/jadwal') return 'Jadwal tayang';
  if (pathname === '/cari') return 'Cari';
  if (pathname === '/koleksi') return 'Koleksi';
  if (pathname === '/notifikasi') return 'Notifikasi';
  if (pathname === '/pengaturan') return 'Pengaturan';
  if (/^\/anime\/[^/]+\/tonton\/?$/.test(pathname)) return 'Pemutar resmi';
  if (/^\/anime\/[^/]+\/?$/.test(pathname)) return 'Detail anime';
  return 'myanime';
}

/** Frame around every screen: skip link, top bar, main region, navigation, toasts. Used as the layout route. */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const title = useShellTitle(location.pathname) || fallbackTitle(location.pathname);
  const { unread } = useInbox();
  const isRoot = ROOT_PATHS.includes(location.pathname);

  useAlertsSync();

  // `navigate` changes identity with the route; the native listeners are registered once.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => initNative((path) => navigateRef.current(path)), []);

  // New screens start at the top; going back keeps the browser's restored position.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  const goBack = () => {
    // 'default' is the key of the first entry: nothing to go back to inside the app.
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  };

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#konten"
        onClick={(event) => {
          // A plain hash link would be read as a route by the hash router.
          event.preventDefault();
          document.getElementById('konten')?.focus();
        }}
      >
        Lewati ke konten
      </a>
      {isRoot ? (
        <TopBar variant="root" title={title} unread={unread} />
      ) : (
        <TopBar variant="inner" title={title} onBack={goBack} actions={<TopBarActionsSlot />} />
      )}
      <SideNav />
      <main id="konten" className="shell__main" tabIndex={-1}>
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<StateBlock variant="loading" shape="rows" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <BottomNav />
      <ToastHost />
    </div>
  );
}
