import { StateBlock } from '../components';
import { useDocumentTitle } from '../hooks';

// C08 placeholder: the real screen replaces this file.
export default function Settings() {
  useDocumentTitle('Pengaturan');
  return (
    <div className="page">
      <StateBlock variant="empty" title="Belum ada apa-apa di sini" body="Bagian Pengaturan lagi disiapkan." />
    </div>
  );
}
