import { useMemo } from 'react';
import { useData } from '@/store/useData';
import { useFilters } from '@/store/useFilters';
import { Button } from './Button';
import './FilterBar.css';

// Global filter controls (symbol, date range, account, asset, side, outcome).
// Writes to the shared filter store, so it drives every view at once.
const ASSETS = ['all', 'stock', 'option', 'future', 'forex', 'crypto', 'index'] as const;
const SIDES = ['all', 'long', 'short'] as const;
const OUTCOMES = ['all', 'win', 'loss'] as const;

export function FilterBar() {
  const trades = useData((s) => s.trades);
  const f = useFilters();

  const accounts = useMemo(() => [...new Set(trades.map((t) => t.account))].sort(), [trades]);

  return (
    <div className="apex-filterbar">
      <input
        className="apex-field mono"
        placeholder="Symbol"
        value={f.symbol}
        onChange={(e) => f.set({ symbol: e.target.value })}
        style={{ width: 110 }}
      />
      <input className="apex-field" type="date" value={f.dateFrom ?? ''} onChange={(e) => f.set({ dateFrom: e.target.value || null })} />
      <input className="apex-field" type="date" value={f.dateTo ?? ''} onChange={(e) => f.set({ dateTo: e.target.value || null })} />
      <select className="apex-field" value={f.account} onChange={(e) => f.set({ account: e.target.value })}>
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <select className="apex-field" value={f.assetType} onChange={(e) => f.set({ assetType: e.target.value as never })}>
        {ASSETS.map((a) => (
          <option key={a} value={a}>{a === 'all' ? 'All assets' : a}</option>
        ))}
      </select>
      <select className="apex-field" value={f.side} onChange={(e) => f.set({ side: e.target.value as never })}>
        {SIDES.map((s) => (
          <option key={s} value={s}>{s === 'all' ? 'Both sides' : s}</option>
        ))}
      </select>
      <select className="apex-field" value={f.outcome} onChange={(e) => f.set({ outcome: e.target.value as never })}>
        {OUTCOMES.map((o) => (
          <option key={o} value={o}>{o === 'all' ? 'Win + loss' : o}</option>
        ))}
      </select>
      <Button onClick={() => f.reset()}>Clear</Button>
    </div>
  );
}
