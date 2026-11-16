import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C05 placeholder: the real screen replaces this file.
export default function Watch() {
  useDocumentTitle('Pemutar resmi');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Pemutar resmi lagi disiapkan." />
    </div>
  );
}
