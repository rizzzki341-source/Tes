import { NavLink } from 'react-router';
import { CalendarDays, House, Library, Search, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/jadwal', label: 'Jadwal', icon: CalendarDays },
  { to: '/cari', label: 'Cari', icon: Search },
  { to: '/koleksi', label: 'Koleksi', icon: Library },
];

function Items() {
  return (
    <ul className="nav__list">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <li key={to} className="nav__item">
          {/* NavLink sets aria-current="page" on the active route. */}
          <NavLink to={to} end={to === '/'} className="nav__link">
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Fixed bar at the bottom; shown below 900 px. */
export function BottomNav() {
  return (
    <nav className="nav nav--bottom" aria-label="Navigasi utama">
      <Items />
    </nav>
  );
}

/** Rail on the left; shown from 900 px. */
export function SideNav() {
  return (
    <nav className="nav nav--side" aria-label="Navigasi utama">
      <Items />
    </nav>
  );
}
