import { useMemo, useState } from 'react';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { useSettings } from '@/store/useSettings';
import { adjustCosts } from '@/domain/costs';
import { formatMoney, formatPct } from '@/domain/money';
import type { Trade } from '@/domain/types';
import { FilterBar } from '@/components/FilterBar';
import { TradeDrawer } from '@/components/TradeDrawer';
import { Card } from '@/components/Card';
import { PageHeader } from './PageHeader';
import './Trades.css';

type SortKey = 'openDate' | 'symbol' | 'netPnl' | 'returnPct' | 'qty' | 'durationMs';

const COLUMNS: { key: SortKey | 'side' | 'close'; label: string; sortable?: SortKey; num?: boolean }[] = [
  { key: 'symbol', label: 'Symbol', sortable: 'symbol' },
  { key: 'side', label: 'Side' },
  { key: 'openDate', label: 'Open', sortable: 'openDate' },
  { key: 'close', label: 'Close' },
  { key: 'qty', label: 'Qty', sortable: 'qty', num: true },
  { key: 'returnPct', label: 'Return', sortable: 'returnPct', num: true },
  { key: 'netPnl', label: 'Net PnL', sortable: 'netPnl', num: true },
];

export function Trades() {
  const allTrades = useData((s) => s.trades);
  const filters = useFilters();
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const [sortKey, setSortKey] = useState<SortKey>('openDate');
  const [asc, setAsc] = useState(false);
  const [active, setActive] = useState<Trade | null>(null);

  const adjusted = useMemo(() => adjustCosts(allTrades, { includeCommission, includeFees }), [allTrades, includeCommission, includeFees]);

  const rows = useMemo(() => {
    const filtered = applyFilters(adjusted, filters);
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [adjusted, filters, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Journal" title="Trades" actions={<span className="mono" style={{ color: 'var(--muted)' }}>{rows.length} trades</span>} />
      <FilterBar />

      {allTrades.length === 0 ? (
        <Card style={{ minHeight: 160, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
          No trades yet — import a .tlg or CSV file.
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="apex-table-wrap">
            <table className="apex-table mono">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={c.num ? 'num' : ''}
                      onClick={() => c.sortable && toggleSort(c.sortable)}
                      style={{ cursor: c.sortable ? 'pointer' : 'default' }}
                    >
                      {c.label}
                      {c.sortable === sortKey ? (asc ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => setActive(t)}>
                    <td>{t.symbol}</td>
                    <td className={t.side === 'long' ? 'long' : 'short'}>{t.side}</td>
                    <td>{t.openDate.slice(0, 10)}</td>
                    <td>{t.closeDate ? t.closeDate.slice(0, 10) : 'open'}</td>
                    <td className="num">{t.qty}</td>
                    <td className="num">{formatPct(t.returnPct)}</td>
                    <td className="num" style={{ color: t.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>
                      {formatMoney(t.netPnl, { signed: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TradeDrawer trade={active} onClose={() => setActive(null)} />
    </>
  );
}
