import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C03 placeholder: the real screen replaces this file.
export default function Search() {
  useDocumentTitle('Cari');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Cari lagi disiapkan." />
    </div>
  );
}
