import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string = string> {
  /** Prefix for element ids; must match the TabPanel that goes with these tabs. */
  idBase: string;
  /** Accessible name of the tab list. */
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Lets a long row of tabs scroll sideways (day tabs). */
  scrollable?: boolean;
}

export const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;
export const tabPanelId = (idBase: string, id: string) => `${idBase}-panel-${id}`;

export function Tabs<T extends string = string>({ idBase, label, items, value, onChange, scrollable = false }: TabsProps<T>) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    const target = items[next];
    if (!target) return;
    onChange(target.id);
    document.getElementById(tabId(idBase, target.id))?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={scrollable ? 'tabs tabs--scroll' : 'tabs'}>
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={tabId(idBase, item.id)}
            className="tabs__tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => move(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  idBase: string;
  /** Id of the tab this panel belongs to. Render only the panel of the selected tab. */
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ idBase, id, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idBase, id)}
      aria-labelledby={tabId(idBase, id)}
      tabIndex={0}
      className={['tabs__panel', className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
