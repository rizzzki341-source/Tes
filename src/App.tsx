import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { QueryProvider } from './lib/query';

const Home = lazy(() => import('./screens/Home'));
const Schedule = lazy(() => import('./screens/Schedule'));
const Search = lazy(() => import('./screens/Search'));
const Detail = lazy(() => import('./screens/Detail'));
const Watch = lazy(() => import('./screens/Watch'));
const Library = lazy(() => import('./screens/Library'));
const Inbox = lazy(() => import('./screens/Inbox'));
const Settings = lazy(() => import('./screens/Settings'));
const NotFound = lazy(() => import('./screens/NotFound'));
// Development only: the production build drops both the route and the file.
const Design = import.meta.env.DEV ? lazy(() => import('./dev/Design')) : null;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="jadwal" element={<Schedule />} />
        <Route path="cari" element={<Search />} />
        <Route path="anime/:id" element={<Detail />} />
        <Route path="anime/:id/tonton" element={<Watch />} />
        <Route path="koleksi" element={<Library />} />
        <Route path="notifikasi" element={<Inbox />} />
        <Route path="pengaturan" element={<Settings />} />
        {Design ? <Route path="design" element={<Design />} /> : null}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </QueryProvider>
  );
}
