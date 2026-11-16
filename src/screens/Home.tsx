import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C01 placeholder: the real screen replaces this file.
export default function Home() {
  useDocumentTitle('Beranda');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Beranda lagi disiapkan." />
    </div>
  );
}
