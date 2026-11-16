import { useState, type ReactNode } from 'react';
import { Bell, BellRing, Search as SearchIcon, Share2, Trash } from 'lucide-react';
import {
  AiringRow,
  AnimeCard,
  Button,
  ButtonLink,
  Chip,
  ChipLink,
  ConfirmDialog,
  Countdown,
  EpisodeTracker,
  ExternalLink,
  FeaturedCarousel,
  IconButton,
  ListRow,
  OfficialPlayer,
  Poster,
  RadioGroup,
  Rail,
  SelectField,
  SourceList,
  StateBlock,
  StatusChip,
  Switch,
  TabPanel,
  Tabs,
  TextField,
  TopBar,
  TopBarActions,
  toast,
} from '../components';
import { useDocumentTitle, useNow } from '../hooks';
import { ApiError } from '../lib/anilist/client';
import type { Anime } from '../lib/anilist/types';
import { toWatchSources } from '../lib/sources';

// Development-only gallery: every shared primitive and state on one page, with made-up data.

function sample(id: number, romaji: string, extra: Partial<Anime> = {}): Anime {
  return {
    id,
    title: { romaji, english: null, native: null },
    cover: null,
    coverSmall: null,
    banner: null,
    format: 'TV',
    status: 'RELEASING',
    episodes: 12,
    score: 80 + (id % 15),
    popularity: 1000 * id,
    genres: ['Action', 'Fantasy', 'Drama'],
    season: 'FALL',
    seasonYear: 2026,
    nextAiring: null,
    ...extra,
  };
}

const SAMPLES: Anime[] = [
  sample(1, 'Langit di Ujung Musim'),
  sample(2, 'Kereta Terakhir Menuju Bintang yang Judulnya Sengaja Dibuat Panjang Sekali', { format: 'MOVIE', episodes: 1 }),
  sample(3, 'Dapur Kecil Nenek', { score: null }),
  sample(4, 'Penjaga Mercusuar', { format: 'ONA' }),
  sample(5, 'Orkes Hujan'),
  sample(6, 'Sepeda Biru'),
];

const SOURCES = toWatchSources([
  { site: 'YouTube', url: 'https://www.youtube.com/playlist?list=PLexample1234567890', language: 'Indonesian' },
  { site: 'YouTube', url: 'https://www.youtube.com/watch?v=abcdefghijk', language: null },
  { site: 'Bilibili TV', url: 'https://www.bilibili.tv/id/play/1', language: 'Indonesian' },
  { site: 'Netflix', url: 'https://www.netflix.com/title/1', language: null },
]);

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stack">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

export default function Design() {
  useDocumentTitle('Galeri komponen');
  const now = useNow(30_000);
  const [pressed, setPressed] = useState(false);
  const [chip, setChip] = useState(true);
  const [tab, setTab] = useState('a');
  const [day, setDay] = useState('0');
  const [select, setSelect] = useState('TV');
  const [text, setText] = useState('');
  const [backup, setBackup] = useState('');
  const [on, setOn] = useState(true);
  const [lang, setLang] = useState('romaji');
  const [watched, setWatched] = useState<number[]>([1, 2, 3]);
  const [dialog, setDialog] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="page">
      <TopBarActions>
        <IconButton label="Bagikan" icon={<Share2 />} onClick={() => toast('Tautan disalin')} />
      </TopBarActions>

      <Block title="TopBar">
        <TopBar variant="root" title="Beranda" unread={12} />
        <TopBar variant="inner" title="Judul halaman yang panjang supaya terpotong rapi" onBack={() => toast('Kembali')} />
      </Block>

      <Block title="Button">
        <div className="cluster">
          <Button variant="primary">Utama</Button>
          <Button>Sekunder</Button>
          <Button variant="ghost">Polos</Button>
          <Button variant="danger">Hapus semua</Button>
          <Button variant="primary" disabled>
            Nonaktif
          </Button>
          <Button icon={pressed ? <BellRing /> : <Bell />} pressed={pressed} onClick={() => setPressed(!pressed)}>
            Langganan
          </Button>
        </div>
        <div className="cluster">
          <Button size="sm" variant="primary">
            Kecil
          </Button>
          <Button size="sm">Kecil</Button>
          <ButtonLink to="/" size="sm">
            Tautan dalam
          </ButtonLink>
          <ButtonLink href="https://anilist.co" size="sm">
            Tautan luar
          </ButtonLink>
          <IconButton label="Hapus" icon={<Trash />} />
          <IconButton label="Langganan" icon={<Bell />} pressed />
        </div>
        <Button block variant="primary">
          Selebar wadah
        </Button>
      </Block>

      <Block title="Chip">
        <div className="chip-row">
          <Chip selected={chip} onClick={() => setChip(!chip)}>
            Hanya langganan
          </Chip>
          <Chip selected={false}>Belum dipilih</Chip>
          <ChipLink to="/cari?genre=Action">Aksi</ChipLink>
          <StatusChip>Sudah tayang</StatusChip>
          <StatusChip tone="accent">2 hr 4 j</StatusChip>
          <StatusChip tone="warning">Episode terakhir</StatusChip>
        </div>
      </Block>

      <Block title="Tabs">
        <Tabs
          idBase="demo"
          label="Contoh tab"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'a', label: 'Langganan' },
            { id: 'b', label: 'Daftar' },
            { id: 'c', label: 'Riwayat' },
          ]}
        />
        <TabPanel idBase="demo" id={tab}>
          <p className="muted">Isi tab {tab}</p>
        </TabPanel>
        <Tabs
          idBase="hari"
          label="Hari"
          scrollable
          value={day}
          onChange={setDay}
          items={['Hari ini', 'Besok', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((label, i) => ({ id: String(i), label }))}
        />
      </Block>

      <Block title="Fields">
        <TextField label="Cari anime" type="search" value={text} onChange={setText} placeholder="Judul anime" clearable icon={<SearchIcon />} />
        <SelectField
          label="Format"
          value={select}
          onChange={setSelect}
          hint="Petunjuk singkat di bawah kontrol."
          options={[
            { value: 'TV', label: 'Seri TV' },
            { value: 'MOVIE', label: 'Film' },
          ]}
        />
        <TextField label="Teks cadangan" multiline value={backup} onChange={setBackup} error="Ini bukan cadangan myanime." />
        <TextField label="Nonaktif" value="tidak bisa diubah" onChange={() => {}} disabled />
        <Switch label="Pengingat episode" hint="Kabari saat episode baru tayang." checked={on} onChange={setOn} />
        <Switch label="Nonaktif" checked={false} onChange={() => {}} disabled />
        <RadioGroup
          label="Bahasa judul"
          value={lang}
          onChange={setLang}
          options={[
            { value: 'romaji', label: 'Romaji', hint: 'Sousou no Frieren' },
            { value: 'english', label: 'Inggris' },
            { value: 'native', label: 'Jepang (asli)' },
          ]}
        />
      </Block>

      <Block title="Poster">
        <div className="cluster">
          <Poster cover={null} title="Langit" size="thumb" />
          <Poster cover={null} title="Orkes" size="lg" />
        </div>
      </Block>

      <Block title="AnimeCard (grid)">
        <div className="card-grid">
          <AnimeCard anime={SAMPLES[0]!} badge="Ep 8" sublabel="2 jam lalu" />
          <AnimeCard anime={SAMPLES[1]!} badge="Film" />
          <AnimeCard anime={SAMPLES[2]!} />
        </div>
      </Block>

      <Rail title="Rail terisi" seeAllTo="/cari">
        {SAMPLES.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} layout="rail" />
        ))}
      </Rail>
      <Rail title="Rail memuat" loading />

      <Block title="FeaturedCarousel">
        <FeaturedCarousel items={SAMPLES.slice(0, 3)} />
      </Block>

      <Block title="AiringRow / ListRow">
        <ul className="rows">
          <AiringRow
            mediaId={1}
            title={SAMPLES[0]!.title}
            cover={null}
            episode={8}
            atMs={now - 2 * 3_600_000}
            nowMs={now}
            subscribed={subscribed}
            onToggleSubscribe={() => setSubscribed(!subscribed)}
          />
          <AiringRow
            mediaId={2}
            title={SAMPLES[1]!.title}
            cover={null}
            episode={12}
            atMs={now + 26 * 3_600_000}
            nowMs={now}
            finale
            subscribed
            onToggleSubscribe={() => {}}
          />
          <AiringRow mediaId={3} title={SAMPLES[2]!.title} cover={null} episode={3} atMs={now - 40 * 60_000} nowMs={now} timeMode="relative" unread />
          <ListRow to="/anime/4" title="Penjaga Mercusuar" cover={null} secondary="Sedang ditonton" trailing="12/24" />
          <ListRow
            to="/anime/5"
            title="Orkes Hujan"
            cover={null}
            secondary="Episode 5 · 2 jam lalu"
            trailing={<IconButton label="Hapus dari riwayat: Orkes Hujan" icon={<Trash />} />}
          />
        </ul>
        <p>
          Countdown mandiri: <Countdown targetMs={now + 95 * 60_000} />
        </p>
      </Block>

      <Block title="EpisodeTracker">
        <EpisodeTracker
          count={130}
          watched={watched}
          onToggle={(episode, isWatched) =>
            setWatched(isWatched ? [...watched, episode] : watched.filter((n) => n !== episode))
          }
          onMarkThrough={(episode) => setWatched(Array.from({ length: episode }, (_, i) => i + 1))}
          onClear={() => setWatched([])}
        />
        <EpisodeTracker count={0} watched={[]} onToggle={() => {}} onMarkThrough={() => {}} onClear={() => {}} />
      </Block>

      <Block title="SourceList">
        <SourceList mediaId={1} sources={SOURCES} />
        <SourceList mediaId={1} sources={[]} />
      </Block>

      <Block title="OfficialPlayer">
        <OfficialPlayer title="Contoh" videoId="bukan id" />
      </Block>

      <Block title="StateBlock">
        <StateBlock variant="stale" onReload={() => toast('Memuat ulang')} />
        <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Anime yang kamu langgani muncul di sini." action={<ButtonLink to="/cari">Cari anime</ButtonLink>} />
        <StateBlock variant="error" error={new ApiError('network', 'offline')} onRetry={() => toast('Mencoba lagi')} />
        <StateBlock variant="error" error={new ApiError('rate-limit', 'busy')} onRetry={() => {}} retrying />
        <StateBlock variant="error" error={new ApiError('not-found', 'missing')} />
        <StateBlock variant="loading" shape="rail" />
        <StateBlock variant="loading" shape="grid" />
        <StateBlock variant="loading" shape="rows" />
        <StateBlock variant="loading" shape="detail" />
      </Block>

      <Block title="Toast / ConfirmDialog / ExternalLink">
        <div className="cluster">
          <Button onClick={() => toast('Ditambahkan ke langganan')}>Tampilkan toast</Button>
          <Button variant="danger" onClick={() => setDialog(true)}>
            Buka dialog
          </Button>
          <ExternalLink href="https://anilist.co">Data: AniList</ExternalLink>
        </div>
        <ConfirmDialog
          open={dialog}
          danger
          title="Hapus semua riwayat?"
          body="Riwayat tontonan di perangkat ini akan dihapus dan tidak bisa dikembalikan."
          confirmLabel="Ya, hapus"
          onConfirm={() => {
            setDialog(false);
            toast('Riwayat dihapus');
          }}
          onCancel={() => setDialog(false)}
        />
      </Block>
    </div>
  );
}
