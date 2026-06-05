// Dashboard: a customizable widget grid (CLAUDE.md §5.1 / §8b item 33). Widgets are
// add/remove/drag-reorder/resize-able with smooth FLIP motion; the layout persists
// locally. Each widget reads a shared context from the global filters + settings.
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import { Card, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { ChartCard } from '@/components/ChartCard';
import { StatGrid } from '@/components/StatGrid';
import { EmptyState } from '@/components/EmptyState';
import { TradeDrawer } from '@/components/TradeDrawer';
import { IconClose, IconImport } from '@/components/Icon';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from './PageHeader';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { useSettings } from '@/store/useSettings';
import { useDashboard, GRID_COLS, DEFAULT_SIZE } from '@/store/useDashboard';
import { computeOverallStats, type OverallStats } from '@/stats/overall';
import { equityCurve } from '@/stats/series';
import { balanceCurve, flowByDay, netDeposits } from '@/stats/cashflow';
import { adjustCosts } from '@/domain/costs';
import { cssVar } from '@/theme/echartsApexTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney, formatPct, toMajor, toMinor } from '@/domain/money';
import type { Trade } from '@/domain/types';
import './Dashboard.css';

interface Ctx {
  stats: OverallStats;
  equityOption: EChartsOption;
  hasCash: boolean;
  currentBalance: number;
  netDep: number;
  recent: Trade[];
  onPickTrade: (t: Trade) => void;
}

interface WidgetDef {
  title: string;
  resizableH?: boolean; // supports vertical resize
  render: (c: Ctx, h?: number) => ReactNode;
}

const num = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '∞');

const WIDGETS: Record<string, WidgetDef> = {
  netPnl: { title: 'Net PnL', render: (c) => <StatCard label="Net PnL" value={formatMoney(c.stats.netPnl, { signed: true })} tone={c.stats.netPnl >= 0 ? 'profit' : 'danger'} sub={`${c.stats.totalTrades} trades`} /> },
  winRate: { title: 'Win rate', render: (c) => <StatCard label="Win rate" value={formatPct(c.stats.winRate)} sub={`${c.stats.wins}W / ${c.stats.losses}L`} /> },
  profitFactor: { title: 'Profit factor', render: (c) => <StatCard label="Profit factor" value={num(c.stats.profitFactor)} /> },
  expectancy: { title: 'Expectancy', render: (c) => <StatCard label="Expectancy" value={formatMoney(c.stats.expectancy, { signed: true })} tone={c.stats.expectancy >= 0 ? 'profit' : 'danger'} /> },
  maxDrawdown: { title: 'Max drawdown', render: (c) => <StatCard label="Max drawdown" value={formatMoney(-c.stats.maxDrawdown)} tone="danger" sub={formatPct(c.stats.maxDrawdownPct)} /> },
  balance: { title: 'Account balance', render: (c) => <StatCard label="Account balance" value={formatMoney(c.currentBalance)} sub={`${formatMoney(c.netDep, { signed: true })} net deposited`} /> },
  trades: { title: 'Trades', render: (c) => <StatCard label="Trades" value={String(c.stats.totalTrades)} sub={`${c.stats.maxConsecWins}W / ${c.stats.maxConsecLosses}L streak`} /> },
  avgTrade: { title: 'Avg trade', render: (c) => <StatCard label="Avg trade" value={formatMoney(c.stats.avgTrade, { signed: true })} tone={c.stats.avgTrade >= 0 ? 'profit' : 'danger'} /> },
  sharpe: { title: 'Sharpe', render: (c) => <StatCard label="Sharpe" value={num(c.stats.sharpe)} sub={`Sortino ${num(c.stats.sortino)}`} /> },
  equity: { title: 'Equity / balance curve', resizableH: true, render: (c, h) => <ChartCard title={c.hasCash ? 'Account balance (incl. deposits / withdrawals)' : 'Equity curve (cumulative net PnL)'} option={c.equityOption} height={h ?? 300} /> },
  statgrid: { title: 'Overall statistics', render: (c) => <StatGrid s={c.stats} /> },
  recent: { title: 'Recent trades', resizableH: true, render: (c, h) => <RecentTrades trades={c.recent} onPick={c.onPickTrade} height={h} /> },
};

const ALL_IDS = Object.keys(WIDGETS);

export function Dashboard() {
  const all = useData((s) => s.trades);
  const cashFlows = useData((s) => s.cashFlows);
  const filters = useFilters();
  const tz = useSettings((s) => s.timezone);
  const startingBalance = useSettings((s) => s.startingBalance);
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const { mode, accent } = useTheme();
  const { items, setItems, toggle, setSize, reset } = useDashboard();
  const nav = useNavigate();

  const [editing, setEditing] = useState(false);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const overRef = useRef<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const flipSnap = useRef<Map<string, DOMRect> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const adjusted = useMemo(() => adjustCosts(all, { includeCommission, includeFees }), [all, includeCommission, includeFees]);
  const trades = useMemo(() => applyFilters(adjusted, filters), [adjusted, filters]);
  const stats = useMemo(() => computeOverallStats(trades, tz), [trades, tz]);
  const curve = useMemo(() => equityCurve(trades, tz), [trades, tz]);

  const startMinor = useMemo(() => toMinor(startingBalance), [startingBalance]);
  const hasCash = startMinor > 0 || cashFlows.length > 0;
  const netDep = useMemo(() => netDeposits(cashFlows), [cashFlows]);
  const balance = useMemo(() => balanceCurve(trades, cashFlows, startMinor, tz), [trades, cashFlows, startMinor, tz]);
  const currentBalance = startMinor + netDep + stats.netPnl;
  const recent = useMemo(() => [...trades].sort((a, b) => (b.closeDate ?? b.openDate).localeCompare(a.closeDate ?? a.openDate)).slice(0, 12), [trades]);

  const equityOption: EChartsOption = useMemo(() => {
    const points = hasCash ? balance.map((p) => ({ date: p.date, v: p.balance })) : curve.map((p) => ({ date: p.date, v: p.cumulative }));
    const flows = flowByDay(cashFlows);
    const markData = [...flows.values()]
      .filter((fd) => points.some((p) => p.date === fd.date))
      .map((fd) => ({
        xAxis: fd.date,
        lineStyle: { color: fd.net >= 0 ? cssVar('--profit') : cssVar('--danger'), type: 'dashed' as const, width: 1.5 },
        label: { formatter: `${fd.net >= 0 ? '▲' : '▼'} ${formatMoney(Math.abs(fd.net), {})}`, color: fd.net >= 0 ? cssVar('--profit') : cssVar('--danger'), fontSize: 10 },
      }));
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoney(Math.round(Number(v) * 100)) },
      xAxis: { type: 'category', data: points.map((p) => p.date), boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `$${v.toLocaleString()}` } },
      series: [{ type: 'line', smooth: true, showSymbol: false, data: points.map((p) => toMajor(p.v)), areaStyle: { opacity: 0.18 }, lineStyle: { width: 2 }, markLine: markData.length ? { symbol: 'none', data: markData, silent: false } : undefined }],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve, balance, cashFlows, hasCash, tz, mode, accent]);

  // FLIP — runs only when the widget ORDER changes (and only for a reorder we
  // initiated, i.e. flipSnap was captured). Translate-only, so content never distorts.
  const orderSig = items.filter((i) => WIDGETS[i.id]).map((i) => i.id).join(',');
  useLayoutEffect(() => {
    const snap = flipSnap.current;
    flipSnap.current = null;
    if (!snap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    nodeRefs.current.forEach((node, id) => {
      const p = snap.get(id);
      if (!p) return;
      const r = node.getBoundingClientRect();
      const dx = p.left - r.left;
      const dy = p.top - r.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        node.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        );
      }
    });
  }, [orderSig]);

  const captureRects = () => {
    const m = new Map<string, DOMRect>();
    nodeRefs.current.forEach((n, id) => m.set(id, n.getBoundingClientRect()));
    return m;
  };

  const startDrag = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDragId(id);
    overRef.current = null;
    setOverId(null);
    // During the drag we only TRACK the hovered target (highlight it). The actual
    // reorder happens once, on drop — this avoids mid-drag reflow thrash/oscillation.
    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const wid = el?.closest('[data-wid]')?.getAttribute('data-wid') ?? null;
      const next = wid && wid !== id ? wid : null;
      if (next !== overRef.current) {
        overRef.current = next;
        setOverId(next);
      }
    };
    const onUp = () => {
      const target = overRef.current;
      if (target && target !== id) {
        const cur = itemsRef.current;
        const from = cur.findIndex((i) => i.id === id);
        const to = cur.findIndex((i) => i.id === target);
        if (from >= 0 && to >= 0 && from !== to) {
          flipSnap.current = captureRects();
          const arr = [...cur];
          const [m] = arr.splice(from, 1);
          arr.splice(to, 0, m);
          setItems(arr);
        }
      }
      setDragId(null);
      setOverId(null);
      overRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeId(id);
    const def = WIDGETS[id];
    const it = itemsRef.current.find((i) => i.id === id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = it?.w ?? 1;
    const startH = it?.h ?? 300;
    const gw = gridRef.current?.clientWidth ?? 0;
    const step = (gw - 12 * (GRID_COLS - 1)) / GRID_COLS + 12;
    const onMove = (ev: PointerEvent) => {
      const dCols = step > 0 ? Math.round((ev.clientX - startX) / step) : 0;
      const w = Math.max(1, Math.min(GRID_COLS, startW + dCols));
      const h = def?.resizableH ? Math.max(180, Math.min(640, startH + (ev.clientY - startY))) : undefined;
      setSize(id, { w, ...(h != null ? { h } : {}) });
    };
    const onUp = () => {
      setResizeId(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (all.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Dashboard" />
        <EmptyState icon={<IconImport size={26} />} title="No data yet" body="Import an Interactive Brokers .tlg or any broker CSV to populate your dashboard — equity curve, calendar, and ~35 metrics." action={<Button variant="primary" onClick={() => nav('/import')}>Import trades</Button>} />
      </>
    );
  }

  const ctx: Ctx = { stats, equityOption, hasCash, currentBalance, netDep, recent, onPickTrade: setActiveTrade };
  const active = items.filter((i) => WIDGETS[i.id]);
  const available = ALL_IDS.filter((id) => !active.some((i) => i.id === id));

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing && <Button onClick={reset}>Reset</Button>}
            <Button variant={editing ? 'primary' : 'ghost'} onClick={() => setEditing((e) => !e)}>{editing ? 'Done' : 'Customize'}</Button>
            <Button variant="primary" onClick={() => nav('/import')}>Import</Button>
          </div>
        }
      />
      <FilterBar />

      {editing && (
        <Card className="apex-dash-addcard" style={{ marginBottom: 12 }}>
          <div className="apex-dash-addlabel">{available.length ? 'ADD WIDGET' : 'ALL WIDGETS ADDED'}</div>
          {available.length > 0 && (
            <div className="apex-dash-add">
              {available.map((id) => (
                <button key={id} className="apex-dash-chip" onClick={() => toggle(id)}>+ {WIDGETS[id].title}</button>
              ))}
            </div>
          )}
          <div className="apex-dash-hint">Drag the handle to reorder · drag a corner to resize · ✕ to remove</div>
        </Card>
      )}

      <div ref={gridRef} className={`apex-dash-grid ${editing ? 'is-editing' : ''}`}>
        {active.map((item) => {
          const def = WIDGETS[item.id];
          const size = DEFAULT_SIZE[item.id];
          return (
            <div
              key={item.id}
              data-wid={item.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(item.id, el);
                else nodeRefs.current.delete(item.id);
              }}
              className={`apex-dash-widget ${editing ? 'is-editing' : ''} ${dragId === item.id ? 'is-dragging' : ''} ${overId === item.id ? 'is-over' : ''} ${resizeId === item.id ? 'is-resizing' : ''}`}
              style={{ gridColumn: `span ${item.w}` }}
            >
              {editing && (
                <div className="apex-dash-bar">
                  <button className="apex-dash-grip" onPointerDown={(e) => startDrag(item.id, e)}>
                    ⠿ {def.title}
                  </button>
                  <button className="apex-dash-remove" onClick={() => toggle(item.id)} aria-label={`Remove ${def.title}`}><IconClose size={13} /></button>
                </div>
              )}
              {def.render(ctx, item.h)}
              {editing && (
                <span
                  className="apex-dash-resize"
                  title={def.resizableH ? 'Drag to resize' : 'Drag to resize width'}
                  onPointerDown={(e) => startResize(item.id, e)}
                />
              )}
              {editing && size && (item.w !== size.w || (def.resizableH && item.h !== size.h)) && (
                <span className="apex-dash-wbadge mono">{item.w}×{def.resizableH && item.h ? `${item.h}` : 'auto'}</span>
              )}
            </div>
          );
        })}
      </div>

      <TradeDrawer trade={activeTrade} onClose={() => setActiveTrade(null)} />
    </>
  );
}

function RecentTrades({ trades, onPick, height }: { trades: Trade[]; onPick: (t: Trade) => void; height?: number }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 0', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--muted)', textTransform: 'uppercase' }}>Recent trades</div>
      <div style={{ maxHeight: height ?? 320, overflow: 'auto' }}>
        <table className="apex-dash-recent mono">
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} onClick={() => onPick(t)}>
                <td style={{ fontWeight: 900 }}>{t.symbol}</td>
                <td className={t.side === 'long' ? 'pos' : 'neg'} style={{ textTransform: 'capitalize' }}>{t.side}</td>
                <td>{(t.closeDate ?? t.openDate).slice(0, 10)}</td>
                <td style={{ textAlign: 'right', color: t.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>{formatMoney(t.netPnl, { signed: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
