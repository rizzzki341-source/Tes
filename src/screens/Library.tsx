import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C06 placeholder: the real screen replaces this file.
export default function Library() {
  useDocumentTitle('Koleksi');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Koleksi lagi disiapkan." />
    </div>
  );
}
