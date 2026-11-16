import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { create } from 'zustand';
import { IconButton, IconLink } from './IconButton';

export type TopBarProps =
  | {
      variant: 'root';
      /** Screen name; printed as a visually hidden h1. */
      title: string;
      /** Unread inbox items; the bell shows a badge above 0 ("9+" above 9). */
      unread?: number;
    }
  | {
      variant: 'inner';
      /** Screen name; printed as the visible h1. */
      title: string;
      onBack: () => void;
      /** Extra controls on the right (IconButtons). */
      actions?: ReactNode;
    };

export function TopBar(props: TopBarProps) {
  if (props.variant === 'root') {
    const unread = props.unread ?? 0;
    return (
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="topbar__brand" aria-label="myanime, ke Beranda">
            myanime
          </Link>
          <h1 className="visually-hidden">{props.title}</h1>
          <div className="topbar__actions">
            <IconLink to="/notifikasi" label="Notifikasi" icon={<Bell />} badge={unread} badgeLabel={`${unread} belum dibaca`} />
            <IconLink to="/pengaturan" label="Pengaturan" icon={<Settings />} />
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <IconButton label="Kembali" icon={<ArrowLeft />} onClick={props.onBack} />
        <h1 className="topbar__title">{props.title}</h1>
        <div className="topbar__actions">{props.actions}</div>
      </div>
    </header>
  );
}

interface SlotState {
  element: HTMLElement | null;
  setElement(element: HTMLElement | null): void;
}

const useActionsSlot = create<SlotState>()((set) => ({
  element: null,
  setElement: (element) => set({ element }),
}));

/** Where `TopBarActions` renders into. Used by AppShell inside the inner top bar. */
export function TopBarActionsSlot() {
  const setElement = useActionsSlot((state) => state.setElement);
  useEffect(() => () => setElement(null), [setElement]);
  return <div className="topbar__slot" ref={setElement} />;
}

/**
 * Puts its children (IconButtons) on the right side of the inner top bar.
 * Render it anywhere inside a screen; it shows nothing on the four root tabs.
 */
export function TopBarActions({ children }: { children: ReactNode }) {
  const element = useActionsSlot((state) => state.element);
  return element ? createPortal(children, element) : null;
}
