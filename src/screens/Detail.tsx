import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C04 placeholder: the real screen replaces this file.
export default function Detail() {
  useDocumentTitle('Detail anime');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Detail anime lagi disiapkan." />
    </div>
  );
}
