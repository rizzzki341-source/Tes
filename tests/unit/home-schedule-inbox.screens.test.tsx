// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiringItem, HomeData } from '../../src/lib/anilist/types';
import { queryKeys } from '../../src/lib/query';
import { addDays, startOfLocalDay } from '../../src/lib/time';
import Home from '../../src/screens/Home';
import Inbox from '../../src/screens/Inbox';
import Schedule from '../../src/screens/Schedule';
import { useLibrary } from '../../src/store/library';
import { anime, tracking } from './helpers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date(2026, 10, 17, 12, 0, 0).getTime();
const HOUR = 3_600_000;
const sec = (ms: number) => Math.floor(ms / 1000);

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
let search = '';

function LocationProbe() {
  search = useLocation().search;
  return null;
}

async function render(path: string, screen: ReactNode): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          {screen}
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

/** Lets pending requests settle (the API limiter spaces them by 300 ms). */
async function settle(until: () => boolean): Promise<void> {
  for (let i = 0; i < 60 && !until(); i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }
}

const text = () => host.textContent ?? '';
const headings = () => [...host.querySelectorAll('h2')].map((h) => h.textContent);
const button = (name: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === name || b.getAttribute('aria-label') === name) as HTMLButtonElement | undefined;
const click = (element: Element | undefined | null) => act(async () => (element as HTMLElement).click());
const failingFetch = () => vi.fn(async () => new Response('{}', { status: 500 }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // Nothing in this file may reach the real API.
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline in tests'))));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  useLibrary.getState().resetAll();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function homeData(): HomeData {
  return {
    trending: Array.from({ length: 8 }, (_, i) => anime(100 + i)),
    latest: [
      { id: 1, episode: 7, airingAt: sec(NOW - 2 * HOUR), anime: anime(21) },
      { id: 2, episode: 6, airingAt: sec(NOW - 170 * HOUR), anime: anime(21) },
      { id: 3, episode: 3, airingAt: sec(NOW - 5 * 60_000), anime: anime(22) },
    ],
    season: [anime(31)],
    upcoming: [anime(41, { status: 'NOT_YET_RELEASED' })],
    movies: [anime(51, { format: 'MOVIE' })],
    top: [anime(61)],
  };
}

describe('Beranda', () => {
  it('shows the sections in order with their links', async () => {
    client.setQueryData(queryKeys.home, homeData());
    useLibrary.getState().setWatched(anime(21), 1, true, NOW);
    useLibrary.getState().setWatched(anime(21), 2, true, NOW);
    await render('/', <Home />);

    expect(headings()).toEqual(['Lanjut nonton', 'Jelajahi genre', 'Episode terbaru', 'Musim ini', 'Segera tayang', 'Film', 'Skor tertinggi']);
    expect(host.querySelector('.rail a.card')?.getAttribute('aria-label')).toBe('Anime 21, Lanjut Ep 3');
    expect(host.querySelectorAll('.featured__slide')).toHaveLength(6);
    expect(host.querySelector('.home-genres a')?.getAttribute('href')).toMatch(/^\/cari\?genre=/);

    const rails = [...host.querySelectorAll('section.rail')];
    const more = rails.map((rail) => rail.querySelector('.rail__more')?.getAttribute('href'));
    expect(more).toEqual([
      '/koleksi?tab=daftar',
      '/jadwal',
      '/cari?season=FALL&year=2026&sort=POPULARITY_DESC',
      '/cari?status=NOT_YET_RELEASED',
      '/cari?format=MOVIE&sort=TRENDING_DESC',
      '/cari?sort=SCORE_DESC',
    ]);
    const latest = [...rails[1]!.querySelectorAll('a.card')].map((a) => a.getAttribute('aria-label'));
    expect(latest).toEqual(['Anime 22, Ep 3, 5 menit lalu', 'Anime 21, Ep 7, 2 jam lalu']);
    expect(host.querySelector('.state-stale')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hides "Lanjut nonton" when nothing is in progress and shows skeletons on first load', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    await render('/', <Home />);
    expect(headings()).not.toContain('Lanjut nonton');
    expect(host.querySelectorAll('.rail__list[aria-busy="true"]')).toHaveLength(5);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the error with a retry when nothing is cached', async () => {
    vi.stubGlobal('fetch', failingFetch());
    await render('/', <Home />);
    await settle(() => host.querySelector('[role="alert"]') !== null);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Sumber data sedang bermasalah.');
    expect(button('Coba lagi')).toBeDefined();
    expect(headings()).toEqual(['Jelajahi genre']);
  });

  it('keeps saved data on screen with the stale banner when the refresh fails', async () => {
    client.setQueryData(queryKeys.home, homeData(), { updatedAt: NOW - 3_600_000 });
    vi.stubGlobal('fetch', failingFetch());
    await render('/', <Home />);
    await settle(() => host.querySelector('.state-stale') !== null);
    expect(host.querySelector('.state-stale')?.textContent).toContain('Menampilkan data tersimpan');
    expect(button('Muat ulang')).toBeDefined();
    expect(headings()).toContain('Episode terbaru');
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});

function dayItems(): AiringItem[] {
  return [
    { id: 12, episode: 5, airingAt: sec(NOW + 3 * HOUR + 15 * 60_000), anime: anime(2) },
    { id: 11, episode: 12, airingAt: sec(NOW - 2 * HOUR), anime: anime(1) },
  ];
}

describe('Jadwal tayang', () => {
  const today = startOfLocalDay(NOW);

  it('lists the day sorted by time with state, count and time zone', async () => {
    client.setQueryData(queryKeys.scheduleDay(today), dayItems());
    await render('/jadwal', <Schedule />);

    const tabs = [...host.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual(['Hari ini', 'Besok', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(headings()).toEqual(['Selasa, 17 November 2026']);
    expect(text()).toContain('2 episode');
    expect(text()).toContain('Jam mengikuti zona waktu perangkatmu');

    const rows = [...host.querySelectorAll('li.row')];
    expect(rows.map((row) => row.querySelector('.row__time')?.textContent)).toEqual(['10.00', '15.15']);
    expect(rows[0]?.textContent).toContain('Episode 12');
    expect(rows[0]?.textContent).toContain('Episode terakhir');
    expect(rows[0]?.textContent).toContain('Sudah tayang');
    expect(rows[1]?.textContent).toContain('3 j 15 m');
    expect(rows[1]?.textContent).not.toContain('Sudah tayang');
  });

  it('subscribes from a row and filters to subscriptions', async () => {
    client.setQueryData(queryKeys.scheduleDay(today), dayItems());
    await render('/jadwal', <Schedule />);

    const bell = button('Langganan Anime 2');
    expect(bell?.getAttribute('aria-pressed')).toBe('false');
    await click(bell);
    expect(useLibrary.getState().entries['2']?.subscribed).toBe(true);
    expect(button('Langganan Anime 2')?.getAttribute('aria-pressed')).toBe('true');

    await click(host.querySelector('input[role="switch"]'));
    expect(search).toBe('?langganan=1');
    expect(host.querySelectorAll('li.row')).toHaveLength(1);
    expect(text()).toContain('1 dari 2 episode');

    await click(button('Langganan Anime 2'));
    expect(useLibrary.getState().entries['2']).toBeUndefined();
    expect(host.querySelectorAll('li.row')).toHaveLength(0);
    expect(text()).toContain('Langgananmu tidak ada yang tayang');
    await click(button('Tampilkan semua'));
    expect(search).toBe('');
    expect(host.querySelectorAll('li.row')).toHaveLength(2);
  });

  it('keeps the selected day in the URL', async () => {
    client.setQueryData(queryKeys.scheduleDay(addDays(today, 2)), []);
    client.setQueryData(queryKeys.scheduleDay(addDays(today, 3)), dayItems());
    await render('/jadwal?hari=2', <Schedule />);
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Kamis');
    expect(headings()).toEqual(['Kamis, 19 November 2026']);
    expect(text()).toContain('Belum ada jadwal di hari ini');

    await click([...host.querySelectorAll('[role="tab"]')][3]);
    expect(search).toBe('?hari=3');
    expect(headings()).toEqual(['Jumat, 20 November 2026']);
    expect(host.querySelectorAll('li.row')).toHaveLength(2);
  });

  it('shows loading rows, then the error with a retry', async () => {
    vi.stubGlobal('fetch', failingFetch());
    await render('/jadwal', <Schedule />);
    expect(host.querySelector('[role="status"][aria-busy="true"]')).not.toBeNull();
    await settle(() => host.querySelector('[role="alert"]') !== null);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Sumber data sedang bermasalah.');
    expect(button('Coba lagi')).toBeDefined();
  });

  it('shows the stale banner above saved rows when the refresh fails', async () => {
    client.setQueryData(queryKeys.scheduleDay(today), dayItems(), { updatedAt: NOW - 3_600_000 });
    vi.stubGlobal('fetch', failingFetch());
    await render('/jadwal', <Schedule />);
    await settle(() => host.querySelector('.state-stale') !== null);
    expect(host.querySelector('.state-stale')).not.toBeNull();
    expect(host.querySelectorAll('li.row')).toHaveLength(2);
  });
});

describe('Notifikasi', () => {
  const subscribe = (id: number, at: number) => useLibrary.getState().toggleSubscribe(anime(id), at);

  it('points to Jadwal and Cari when nothing is subscribed', async () => {
    await render('/notifikasi', <Inbox />);
    expect(text()).toContain('Belum ada langganan');
    expect([...host.querySelectorAll('.state a')].map((a) => a.getAttribute('href'))).toEqual(['/jadwal', '/cari']);
    expect(text()).toContain('Pengingat berbunyi di aplikasi Android');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says nothing has aired yet when subscriptions are new', async () => {
    subscribe(1, NOW - HOUR);
    client.setQueryData(queryKeys.tracking([1]), tracking([anime(1)], [{ mediaId: 1, episode: 4, airingAt: sec(NOW - 5 * HOUR) }]));
    await render('/notifikasi', <Inbox />);
    expect(text()).toContain('Belum ada episode baru');
    expect(text()).not.toContain('Belum ada langganan');
    expect(button('Tandai semua dibaca')).toBeUndefined();
  });

  it('lists aired episodes newest first, marks unread ones and the upcoming alerts', async () => {
    subscribe(1, NOW - 240 * HOUR);
    subscribe(2, NOW - 240 * HOUR);
    useLibrary.getState().markInboxRead(NOW - 10 * HOUR);
    client.setQueryData(
      queryKeys.tracking([1, 2]),
      tracking(
        [anime(1), anime(2)],
        [
          { mediaId: 1, episode: 11, airingAt: sec(NOW - 26 * HOUR) },
          { mediaId: 2, episode: 12, airingAt: sec(NOW - 2 * HOUR) },
          { mediaId: 1, episode: 12, airingAt: sec(NOW + 5 * HOUR) },
          { mediaId: 2, episode: 99, airingAt: sec(NOW - 800 * HOUR) },
        ],
      ),
    );
    await render('/notifikasi', <Inbox />);

    expect(headings()).toEqual(['Sudah tayang', 'Akan datang']);
    const [aired, upcoming] = [...host.querySelectorAll('ul.rows')];
    const rows = [...aired!.querySelectorAll('li.row')];
    expect(rows.map((row) => row.querySelector('a')?.getAttribute('href'))).toEqual(['/anime/2', '/anime/1']);
    expect(rows[0]?.className).toContain('row--unread');
    expect(rows[0]?.querySelector('a')?.textContent).toBe('Belum dibaca: Anime 2');
    expect(rows[0]?.textContent).toContain('2 jam lalu');
    expect(rows[0]?.textContent).toContain('Episode terakhir');
    expect(rows[0]?.textContent).toContain('Sudah tayang');
    expect(rows[1]?.className).not.toContain('row--unread');
    expect(rows[1]?.textContent).toContain('Episode 11');
    expect(text()).toContain('1 belum dibaca');

    const next = [...upcoming!.querySelectorAll('li.row')];
    expect(next).toHaveLength(1);
    expect(next[0]?.textContent).toContain('Episode 12 · Hari ini, 17.00');
    expect(next[0]?.textContent).toContain('5 j');

    await click(button('Tandai semua dibaca'));
    expect(useLibrary.getState().inboxReadAt).toBe(NOW);
    expect(host.querySelector('.row--unread')).toBeNull();
    expect(button('Tandai semua dibaca')?.disabled).toBe(true);
  });

  it('marks the inbox as read when the screen is left', async () => {
    subscribe(1, NOW - 240 * HOUR);
    client.setQueryData(queryKeys.tracking([1]), tracking([anime(1)], [{ mediaId: 1, episode: 4, airingAt: sec(NOW - 5 * HOUR) }]));
    await render('/notifikasi', <Inbox />);
    expect(host.querySelector('.row--unread')).not.toBeNull();
    expect(useLibrary.getState().inboxReadAt).toBe(0);
    await render('/notifikasi', null);
    await settle(() => useLibrary.getState().inboxReadAt > 0);
    expect(useLibrary.getState().inboxReadAt).toBe(NOW);
  });

  it('shows the error with a retry when tracking cannot load', async () => {
    subscribe(1, NOW - HOUR);
    vi.stubGlobal('fetch', failingFetch());
    await render('/notifikasi', <Inbox />);
    await settle(() => host.querySelector('[role="alert"]') !== null);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Sumber data sedang bermasalah.');
    expect(button('Coba lagi')).toBeDefined();
  });
});
