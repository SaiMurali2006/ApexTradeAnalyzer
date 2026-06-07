// Open Positions: trades still open (position never returned to flat). Shows exposure
// and per-position detail. Excluded from the realized-PnL stats on other views.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { useSettings } from '@/store/useSettings';
import { useRates } from '@/store/useRates';
import { adjustCosts } from '@/domain/costs';
import { convertTrades } from '@/domain/currency';
import { contractMultiplier } from '@/domain/multipliers';
import { formatMoney, toMajor } from '@/domain/money';
import type { Currency, Trade } from '@/domain/types';
import { Card, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { TradeDrawer } from '@/components/TradeDrawer';
import { FilterBar } from '@/components/FilterBar';
import { IconPositions } from '@/components/Icon';
import { PageHeader } from './PageHeader';
import './Trades.css';

const DAY = 86_400_000;
const fmtPrice = (minor: number) => toMajor(minor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const heldDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
const exposureOf = (t: Trade) => Math.round(t.avgEntry * t.qty * contractMultiplier(t.assetType, t.symbol));

export function Positions() {
  const all = useData((s) => s.trades);
  const filters = useFilters();
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const currency = useSettings((s) => s.currency);
  const eurUsd = useRates((s) => s.eurUsd);
  const displayCcy: Currency = currency === 'EUR' ? 'EUR' : 'USD';
  const nav = useNavigate();
  const [active, setActive] = useState<Trade | null>(null);

  const open = useMemo(() => {
    const adjusted = convertTrades(adjustCosts(all, { includeCommission, includeFees }), displayCcy, eurUsd);
    return applyFilters(adjusted, filters)
      .filter((t) => t.isOpen)
      .sort((a, b) => exposureOf(b) - exposureOf(a));
  }, [all, includeCommission, includeFees, displayCcy, eurUsd, filters]);

  const totalExposure = useMemo(() => open.reduce((s, t) => s + exposureOf(t), 0), [open]);
  const longs = open.filter((t) => t.side === 'long').length;
  const shorts = open.length - longs;
  const avgHeld = open.length ? Math.round(open.reduce((s, t) => s + heldDays(t.openDate), 0) / open.length) : 0;

  const hasAnyTrades = all.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Open Positions"
        actions={<span className="mono" style={{ color: 'var(--muted)' }}>{open.length} open</span>}
      />
      <FilterBar />

      {open.length === 0 ? (
        <EmptyState
          icon={<IconPositions size={26} />}
          title={hasAnyTrades ? 'No open positions' : 'No data yet'}
          body={hasAnyTrades ? 'All your trades are closed (flat). Open positions appear here when a position has not returned to flat.' : 'Import trades to track open positions.'}
          action={hasAnyTrades ? undefined : <Button variant="primary" onClick={() => nav('/import')}>Import trades</Button>}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatCard label="Open positions" value={String(open.length)} sub={`${longs} long / ${shorts} short`} hint="Trades whose position has not returned to flat." />
            <StatCard label="Total exposure" value={formatMoney(totalExposure)} sub="entry cost basis" hint="Sum of entry cost basis (avg entry × qty × multiplier). Not live market value — the app has no quote feed." />
            <StatCard label="Avg held" value={`${avgHeld}d`} hint="Average days each open position has been held." />
            <StatCard label="Symbols" value={String(new Set(open.map((t) => t.symbol)).size)} hint="Distinct symbols among open positions." />
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div className="apex-table-wrap">
              <table className="apex-table mono">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th className="num">Qty</th>
                    <th className="num">Avg entry</th>
                    <th className="num">Exposure</th>
                    <th>Opened</th>
                    <th className="num">Held</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((t) => (
                    <tr key={t.id} onClick={() => setActive(t)}>
                      <td>{t.symbol}</td>
                      <td className={t.side === 'long' ? 'long' : 'short'}>{t.side}</td>
                      <td className="num">{t.qty}</td>
                      <td className="num">{fmtPrice(t.avgEntry)}</td>
                      <td className="num">{formatMoney(exposureOf(t))}</td>
                      <td>{t.openDate.slice(0, 10)}</td>
                      <td className="num">{heldDays(t.openDate)}d</td>
                      <td>{t.account}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <TradeDrawer trade={active} onClose={() => setActive(null)} />
    </>
  );
}
