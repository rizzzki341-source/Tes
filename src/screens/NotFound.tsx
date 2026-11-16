import { Compass, House, Search } from 'lucide-react';
import { ButtonLink, StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C09
export default function NotFound() {
  useDocumentTitle('Tidak ditemukan');
  return (
    <div className="page">
      <StateBlock
        variant="empty"
        icon={<Compass />}
        title="Halaman ini tidak ada"
        body="Alamatnya mungkin salah ketik, atau halamannya sudah dipindah. Dari Beranda kamu bisa lanjut lagi."
        action={
          <>
            <ButtonLink to="/" variant="primary" icon={<House />}>
              Ke Beranda
            </ButtonLink>
            <ButtonLink to="/cari" icon={<Search />}>
              Cari anime
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
