// Root: loads persisted data on mount, applies settings (currency, futures overrides)
// to the math/format modules, and renders the routed views inside the app shell.
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './views/Dashboard';
import { Import } from './views/Import';
import { Trades } from './views/Trades';
import { Positions } from './views/Positions';
import { Calendar } from './views/Calendar';
import { Charts } from './views/Charts';
import { Settings } from './views/Settings';
import { useData } from './store/useData';
import { useSettings } from './store/useSettings';
import { useRates } from './store/useRates';
import { setDisplayCurrency } from './domain/money';
import { applyFuturesOverrides } from './domain/multipliers';

export function App() {
  const load = useData((s) => s.load);
  const ensureRate = useRates((s) => s.ensure);
  const currency = useSettings((s) => s.currency);
  const futuresOverrides = useSettings((s) => s.futuresOverrides);

  useEffect(() => {
    void load();
    void ensureRate();
  }, [load, ensureRate]);

  // apply persisted settings to the formatting/math modules
  useEffect(() => {
    setDisplayCurrency(currency);
  }, [currency]);
  useEffect(() => {
    applyFuturesOverrides(futuresOverrides);
  }, [futuresOverrides]);

  const location = useLocation();

  // tab title = current view name (favicon shows the Apex logo)
  useEffect(() => {
    const names: Record<string, string> = {
      '/dashboard': 'Dashboard', '/calendar': 'Calendar', '/trades': 'Trades',
      '/positions': 'Positions', '/charts': 'Charts', '/import': 'Import', '/settings': 'Settings',
    };
    const name = names[location.pathname];
    document.title = name ? `${name} · ApexTradeAnalyzer` : 'ApexTradeAnalyzer';
  }, [location.pathname]);

  return (
    <AppShell>
      <div className="apex-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
