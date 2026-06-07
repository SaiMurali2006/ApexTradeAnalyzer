// Trades: sortable, filterable table of reconstructed round-trip trades. Row click
// opens the detail drawer. Respects global filters + commission/fee settings.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { useSettings } from '@/store/useSettings';
import { useRates } from '@/store/useRates';
import { adjustCosts } from '@/domain/costs';
import { convertTrades } from '@/domain/currency';
import { formatMoney, formatPct } from '@/domain/money';
import type { Currency, Trade } from '@/domain/types';
import { FilterBar } from '@/components/FilterBar';
import { TradeDrawer } from '@/components/TradeDrawer';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconTable } from '@/components/Icon';
import { PageHeader } from './PageHeader';
import './Trades.css';

type SortKey = 'openDate' | 'symbol' | 'netPnl' | 'returnPct' | 'qty' | 'durationMs';

// Row windowing: only the rows in (and just around) the viewport are mounted, so a
// 10k+ trade table stays smooth. Below this many rows we render the lot (no overhead).
const ROW_H = 35; // px, matches Trades.css padding+border; keep in sync
const OVERSCAN = 8;
const VIRTUAL_THRESHOLD = 100;

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
  const currency = useSettings((s) => s.currency);
  const eurUsd = useRates((s) => s.eurUsd);
  const displayCcy: Currency = currency === 'EUR' ? 'EUR' : 'USD';
  const [sortKey, setSortKey] = useState<SortKey>('openDate');
  const [asc, setAsc] = useState(false);
  const [active, setActive] = useState<Trade | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  const adjusted = useMemo(() => convertTrades(adjustCosts(allTrades, { includeCommission, includeFees }), displayCcy, eurUsd), [allTrades, includeCommission, includeFees, displayCcy, eurUsd]);

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

  // track the scroll container height so the window covers exactly what's visible
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtual = rows.length > VIRTUAL_THRESHOLD;
  const start = virtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0;
  const end = virtual ? Math.min(rows.length, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN) : rows.length;
  const padTop = start * ROW_H;
  const padBottom = (rows.length - end) * ROW_H;
  const visible = rows.slice(start, end);
  const colCount = COLUMNS.length;

  return (
    <>
      <PageHeader eyebrow="Journal" title="Trades" actions={<span className="mono" style={{ color: 'var(--muted)' }}>{rows.length} trades</span>} />
      <FilterBar />

      {allTrades.length === 0 ? (
        <EmptyState icon={<IconTable size={26} />} title="No trades yet" body="Import a .tlg or CSV file to see your trades here." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="apex-table-wrap" ref={scrollRef} onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
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
                {padTop > 0 && <tr style={{ height: padTop }} aria-hidden><td colSpan={colCount} /></tr>}
                {visible.map((t) => (
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
                {padBottom > 0 && <tr style={{ height: padBottom }} aria-hidden><td colSpan={colCount} /></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TradeDrawer trade={active} onClose={() => setActive(null)} />
    </>
  );
}
