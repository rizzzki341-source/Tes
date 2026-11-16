import { useRef, useState, type ReactNode } from 'react';
import { Copy, RotateCcw, Share2, Trash } from 'lucide-react';
import { Button, ConfirmDialog, ExternalLink, RadioGroup, Switch, TextField, toast } from '../components';
import { useDocumentTitle } from '../hooks';
import { exportBackup, parseBackup } from '../lib/backup';
import { TITLE_LANG_LABEL } from '../lib/catalog';
import { ensureAlertPermission } from '../lib/notifications';
import { copyText, isNative, shareText } from '../lib/platform';
import { useLibrary, type PersistedLibrary } from '../store/library';
import { TITLE_LANG_EXAMPLE, TITLE_LANG_ORDER, alertNote, backupSummary, type AlertPermission } from './settings.helpers';
import './settings.css';

const TITLE_LANG_OPTIONS = TITLE_LANG_ORDER.map((lang) => ({
  value: lang,
  label: TITLE_LANG_LABEL[lang],
  hint: TITLE_LANG_EXAMPLE[lang],
}));

type Asking = 'restore' | 'history' | 'all' | null;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

const currentBackup = () => exportBackup(useLibrary.getState(), Date.now());

// C08
export default function Settings() {
  useDocumentTitle('Pengaturan');
  const settings = useLibrary((state) => state.settings);
  const updateSettings = useLibrary((state) => state.updateSettings);

  const [permission, setPermission] = useState<AlertPermission | null>(() => (isNative() ? null : 'unsupported'));
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState<string | undefined>();
  const [incoming, setIncoming] = useState<PersistedLibrary | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const restoreRef = useRef<HTMLDivElement>(null);

  const onAlerts = async (on: boolean) => {
    updateSettings({ alerts: on });
    if (!on) return;
    const result = await ensureAlertPermission();
    if (result === 'denied') updateSettings({ alerts: false });
    setPermission(result);
  };

  const copyBackup = async () => {
    const ok = await copyText(currentBackup());
    toast(ok ? 'Cadangan disalin. Tempel dan simpan di tempat yang aman.' : 'Cadangan gagal disalin. Coba lagi ya.');
  };

  const shareBackup = async () => {
    const result = await shareText({ title: 'Cadangan myanime', text: currentBackup() });
    if (result === 'copied') toast('Menu bagikan tidak tersedia di sini, jadi cadangannya disalin.');
    else if (result === 'failed') toast('Cadangan gagal dibagikan. Coba salin saja.');
  };

  const checkRestore = () => {
    const result = parseBackup(restoreText);
    if (!result.ok) {
      setRestoreError(result.reason);
      restoreRef.current?.querySelector('textarea')?.focus();
      return;
    }
    setRestoreError(undefined);
    setIncoming(result.data);
    setAsking('restore');
  };

  const confirm = () => {
    const store = useLibrary.getState();
    if (asking === 'restore' && incoming) {
      store.replaceAll(incoming);
      setRestoreText('');
      toast('Cadangan dipulihkan');
    } else if (asking === 'history') {
      store.clearHistory();
      toast('Riwayat dihapus');
    } else if (asking === 'all') {
      store.resetAll();
      toast('Semua data dihapus');
    }
    setAsking(null);
  };

  const note = alertNote(permission);

  return (
    <div className="page settings">
      <Section id="settings-tampilan" title="Tampilan">
        <RadioGroup
          label="Bahasa judul"
          value={settings.titleLang}
          options={TITLE_LANG_OPTIONS}
          onChange={(titleLang) => updateSettings({ titleLang })}
        />
        <Switch
          label="Hemat data"
          hint="Sampul dimuat dalam ukuran kecil dan banner tidak ditampilkan."
          checked={settings.dataSaver}
          onChange={(dataSaver) => updateSettings({ dataSaver })}
        />
      </Section>

      <Section id="settings-pengingat" title="Pengingat">
        <Switch
          label="Pengingat episode"
          hint="Kabari aku saat episode baru dari langgananku tayang."
          checked={settings.alerts}
          onChange={(on) => void onAlerts(on)}
        />
        <div aria-live="polite">{note ? <p className="settings-note">{note}</p> : null}</div>
      </Section>

      <Section id="settings-cadangan" title="Cadangan">
        <p className="muted text-sm">
          Langganan, daftar, dan riwayatmu hanya tersimpan di perangkat ini, tanpa akun. Mau pindah perangkat? Salin
          cadangannya di sini, lalu tempel di perangkat baru.
        </p>
        <div className="cluster">
          <Button icon={<Copy />} onClick={() => void copyBackup()}>
            Salin cadangan
          </Button>
          <Button icon={<Share2 />} onClick={() => void shareBackup()}>
            Bagikan cadangan
          </Button>
        </div>
        <div ref={restoreRef} className="settings-restore">
          <TextField
            label="Tempel teks cadangan"
            multiline
            rows={5}
            value={restoreText}
            onChange={(value) => {
              setRestoreText(value);
              setRestoreError(undefined);
            }}
            hint="Tempel seluruh teks yang kamu salin dari menu ini."
            error={restoreError}
            spellCheck={false}
          />
          <div className="cluster">
            <Button variant="primary" icon={<RotateCcw />} onClick={checkRestore}>
              Pulihkan
            </Button>
          </div>
        </div>
      </Section>

      <Section id="settings-hapus" title="Hapus data">
        <p className="muted text-sm">
          Hapus riwayat hanya membuang catatan kapan kamu menonton. Hapus semua data mengosongkan langganan, daftar,
          progres, riwayat, dan pengaturan.
        </p>
        <div className="cluster">
          <Button variant="danger" icon={<Trash />} onClick={() => setAsking('history')}>
            Hapus riwayat
          </Button>
          <Button variant="danger" icon={<Trash />} onClick={() => setAsking('all')}>
            Hapus semua data
          </Button>
        </div>
      </Section>

      <Section id="settings-tentang" title="Tentang">
        <p>myanime versi {__APP_VERSION__}</p>
        <p>
          Data: <ExternalLink href="https://anilist.co">AniList</ExternalLink>
        </p>
        <p className="muted text-sm">
          myanime tidak menyimpan dan tidak menayangkan video sendiri. Pemutaran berjalan di pemutar resmi YouTube atau
          di platform berlisensi. Ada tidaknya sebuah judul mengikuti tiap platform.
        </p>
      </Section>

      <ConfirmDialog
        open={asking === 'restore'}
        title="Ganti data di perangkat ini?"
        body={
          incoming
            ? `Isi cadangan: ${backupSummary(incoming)}. Data yang sekarang ada di perangkat ini akan diganti seluruhnya.`
            : undefined
        }
        confirmLabel="Ya, pulihkan"
        onConfirm={confirm}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === 'history'}
        danger
        title="Hapus semua riwayat?"
        body="Catatan kapan kamu menonton akan hilang. Progres episode dan daftarmu tidak berubah."
        confirmLabel="Ya, hapus"
        onConfirm={confirm}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === 'all'}
        danger
        title="Hapus semua data?"
        body="Langganan, daftar, progres, riwayat, dan pengaturan di perangkat ini akan hilang dan tidak bisa dikembalikan. Salin cadangan dulu kalau masih ragu."
        confirmLabel="Ya, hapus semua"
        onConfirm={confirm}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
}
