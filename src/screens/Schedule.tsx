import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C02 placeholder: the real screen replaces this file.
export default function Schedule() {
  useDocumentTitle('Jadwal tayang');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Jadwal tayang lagi disiapkan." />
    </div>
  );
}
