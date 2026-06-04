// Root: loads persisted data on mount, applies settings (currency, futures overrides)
// to the math/format modules, and renders the routed views inside the app shell.
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './views/Dashboard';
import { Import } from './views/Import';
import { Trades } from './views/Trades';
import { Calendar } from './views/Calendar';
import { Charts } from './views/Charts';
import { Settings } from './views/Settings';
import { useData } from './store/useData';
import { useSettings } from './store/useSettings';
import { setDisplayCurrency } from './domain/money';
import { applyFuturesOverrides } from './domain/multipliers';

export function App() {
  const load = useData((s) => s.load);
  const currency = useSettings((s) => s.currency);
  const futuresOverrides = useSettings((s) => s.futuresOverrides);

  useEffect(() => {
    void load();
  }, [load]);

  // apply persisted settings to the formatting/math modules
  useEffect(() => {
    setDisplayCurrency(currency);
  }, [currency]);
  useEffect(() => {
    applyFuturesOverrides(futuresOverrides);
  }, [futuresOverrides]);

  const location = useLocation();

  return (
    <AppShell>
      <div className="apex-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
