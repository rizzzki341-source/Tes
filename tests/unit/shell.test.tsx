// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes } from '../../src/App';
import { ConfirmDialog, StateBlock, toast, ToastHost } from '../../src/components';
import { ApiError } from '../../src/lib/anilist/client';
import { QueryProvider, createQueryClient } from '../../src/lib/query';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function renderAt(path: string): Promise<void> {
  await act(async () => {
    root.render(
      <QueryProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryProvider>,
    );
  });
  // Screens are lazy: give their chunks a few turns to resolve.
  for (let i = 0; i < 5 && host.querySelector('[aria-busy="true"]'); i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
}

const navLabels = (selector: string) => [...host.querySelectorAll(`${selector} a`)].map((a) => a.textContent);

describe('app shell', () => {
  it('renders the skip link, both navigations and the main region', async () => {
    await renderAt('/');
    expect(host.querySelector('.skip-link')?.textContent).toBe('Lewati ke konten');
    expect(host.querySelector('main#konten')).not.toBeNull();
    expect(navLabels('.nav--bottom')).toEqual(['Beranda', 'Jadwal', 'Cari', 'Koleksi']);
    expect(navLabels('.nav--side')).toEqual(['Beranda', 'Jadwal', 'Cari', 'Koleksi']);
    for (const nav of host.querySelectorAll('nav')) expect(nav.getAttribute('aria-label')).toBe('Navigasi utama');
  });

  it('marks the current tab and shows the root top bar on a root route', async () => {
    await renderAt('/jadwal');
    const current = [...host.querySelectorAll('.nav--bottom a[aria-current="page"]')];
    expect(current.map((a) => a.textContent)).toEqual(['Jadwal']);
    expect(host.querySelector('.topbar__brand')?.textContent).toBe('myanime');
    expect(host.querySelector('h1')?.textContent).toBe('Jadwal tayang');
    expect(host.querySelector('a[aria-label="Notifikasi"]')?.getAttribute('href')).toBe('/notifikasi');
    expect(host.querySelector('a[aria-label="Pengaturan"]')?.getAttribute('href')).toBe('/pengaturan');
    expect(document.title).toBe('Jadwal tayang · myanime');
  });

  it('shows the inner top bar with a back button elsewhere', async () => {
    await renderAt('/pengaturan');
    expect(host.querySelector('.topbar__brand')).toBeNull();
    expect(host.querySelector('button[aria-label="Kembali"]')).not.toBeNull();
    expect(host.querySelector('h1.topbar__title')?.textContent).toBe('Pengaturan');
    expect(host.querySelectorAll('.nav--bottom a[aria-current="page"]')).toHaveLength(0);
  });

  it('renders the not-found screen for unknown routes', async () => {
    await renderAt('/entah/di-mana');
    expect(host.querySelector('h1')?.textContent).toBe('Tidak ditemukan');
    expect(host.textContent).toContain('Halaman ini tidak ada');
    expect(host.querySelector('main a[href="/"]')?.textContent).toContain('Ke Beranda');
  });
});

describe('shared states', () => {
  it('StateBlock picks the error copy from the error kind', async () => {
    await act(async () => {
      root.render(
        <div>
          <StateBlock variant="error" error={new ApiError('network', 'x')} onRetry={() => {}} />
          <StateBlock variant="error" error={new ApiError('not-found', 'x')} />
          <StateBlock variant="loading" shape="grid" />
        </div>,
      );
    });
    const alerts = [...host.querySelectorAll('[role="alert"]')];
    expect(alerts[0]?.textContent).toContain('Tidak ada koneksi. Yang tersimpan tetap bisa dibuka.');
    expect(alerts[0]?.querySelector('button')?.textContent).toBe('Coba lagi');
    expect(alerts[1]?.textContent).toContain('Anime ini tidak ditemukan.');
    expect(alerts[1]?.querySelector('button')).toBeNull();
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('toast shows one message at a time in a polite live region', async () => {
    await act(async () => root.render(<ToastHost />));
    const region = host.querySelector('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    await act(async () => toast('Pertama'));
    await act(async () => toast('Kedua'));
    expect(host.querySelectorAll('.toast')).toHaveLength(1);
    expect(region?.textContent).toBe('Kedua');
  });

  it('ConfirmDialog wires its buttons', async () => {
    const calls: string[] = [];
    await act(async () =>
      root.render(
        <ConfirmDialog open title="Hapus semua data?" body="Tidak bisa dikembalikan." confirmLabel="Ya, hapus" danger onConfirm={() => calls.push('confirm')} onCancel={() => calls.push('cancel')} />,
      ),
    );
    const dialog = host.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    const buttons = [...host.querySelectorAll('dialog button')] as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent)).toEqual(['Batal', 'Ya, hapus']);
    await act(async () => buttons[1]!.click());
    await act(async () => buttons[0]!.click());
    expect(calls).toEqual(['confirm', 'cancel']);
  });
});
