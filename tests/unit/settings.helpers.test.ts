import { describe, expect, it } from 'vitest';
import { TITLE_LANG_EXAMPLE, TITLE_LANG_ORDER, alertNote, backupSummary } from '../../src/screens/settings.helpers';
import { emptyLibrary } from '../../src/store/library';
import { entry } from './helpers';

describe('backupSummary', () => {
  it('counts what the backup holds', () => {
    const data = emptyLibrary();
    data.entries = {
      '1': entry(1, { watched: [1] }),
      '2': entry(2, { subscribed: false, subscribedAt: null, list: 'plan' }),
    };
    data.history = [{ key: '1:1', mediaId: 1, episode: 1, at: 1 }];
    expect(backupSummary(data)).toBe('2 judul, 1 langganan, 1 catatan riwayat');
    expect(backupSummary(emptyLibrary())).toBe('0 judul, 0 langganan, 0 catatan riwayat');
  });
});

describe('alertNote', () => {
  it('explains a refused permission and where to allow it', () => {
    expect(alertNote('denied')).toContain('Pengaturan Android');
  });

  it('explains that alerts ring in the Android app and the inbox works everywhere', () => {
    const note = alertNote('unsupported');
    expect(note).toContain('aplikasi Android');
    expect(note).toContain('Notifikasi');
  });

  it('says nothing when alerts are allowed or not asked yet', () => {
    expect(alertNote('granted')).toBeNull();
    expect(alertNote(null)).toBeNull();
  });
});

describe('title language options', () => {
  it('has an example for each language', () => {
    expect(TITLE_LANG_ORDER).toEqual(['romaji', 'english', 'native']);
    for (const lang of TITLE_LANG_ORDER) expect(TITLE_LANG_EXAMPLE[lang]).toMatch(/^Contoh: /);
  });
});
