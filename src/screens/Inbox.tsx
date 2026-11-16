import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C07 placeholder: the real screen replaces this file.
export default function Inbox() {
  useDocumentTitle('Notifikasi');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Notifikasi lagi disiapkan." />
    </div>
  );
}
