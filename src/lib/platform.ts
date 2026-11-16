import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** The current in-app path (the hash route without its query), e.g. `/anime/21`. */
export function currentHashPath(): string {
  if (typeof window === 'undefined') return '/';
  const path = window.location.hash.replace(/^#/, '').split('?')[0] ?? '';
  return path === '' ? '/' : path;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the selection-based copy below (older WebViews, missing permission).
  }
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  try {
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Native share sheet when there is one, otherwise the link is copied to the clipboard. */
export async function shareLink(data: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: data.title, text: data.text, url: data.url, dialogTitle: data.title });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      // Closing the share sheet is not a failure worth a fallback.
      if (error instanceof Error && error.name === 'AbortError') return 'failed';
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed';
}
