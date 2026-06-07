import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogoBadge } from './ThemePopover';
import {
  IconCalendar,
  IconChart,
  IconClose,
  IconDashboard,
  IconImport,
  IconMenu,
  IconPositions,
  IconSettings,
  IconTable,
} from './Icon';
import './AppShell.css';

// App frame: hover-expand icon rail on desktop, off-canvas drawer + top bar on
// mobile. Renders the logo/theme entry, primary nav, and the routed content.
const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/calendar', label: 'Calendar', Icon: IconCalendar },
  { to: '/trades', label: 'Trades', Icon: IconTable },
  { to: '/positions', label: 'Positions', Icon: IconPositions },
  { to: '/charts', label: 'Charts', Icon: IconChart },
  { to: '/import', label: 'Import', Icon: IconImport },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // close the drawer on route change + on Escape
  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`apex-shell ${navOpen ? 'is-navopen' : ''}`}>
      {/* mobile top bar */}
      <header className="apex-topbar">
        <button className="apex-burger" aria-label="Open menu" onClick={() => setNavOpen(true)}>
          <IconMenu size={18} />
        </button>
        <span className="apex-topbar__title">ApexTradeAnalyzer</span>
      </header>

      {navOpen && <div className="apex-nav-scrim" onClick={() => setNavOpen(false)} />}

      <aside className="apex-sidebar">
        <div className="apex-brand">
          <LogoBadge />
          <div className="apex-brand__text">
            <div className="apex-brand__title">ApexTradeAnalyzer</div>
            <div className="apex-brand__tag">Local trade analytics</div>
          </div>
          <button className="apex-nav-close" aria-label="Close menu" onClick={() => setNavOpen(false)}>
            <IconClose size={16} />
          </button>
        </div>
        <nav className="apex-nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className="apex-navlink">
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="apex-main">{children}</main>
    </div>
  );
}
