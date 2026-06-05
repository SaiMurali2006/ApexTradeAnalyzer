// Calendar: month grid (daily P&L tints + weekly summary) and a year heatmap, with
// cash-flow badges. Click a day to drill into its trades and deposits/withdrawals.
import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { dayMap, heatmapData, monthGrid, type DayCell } from '@/stats/calendar';
import { flowByDay, type FlowMap } from '@/stats/cashflow';
import { formatMoney, toMajor } from '@/domain/money';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState } from '@/components/EmptyState';
import { IconCalendar } from '@/components/Icon';
import { FilterBar } from '@/components/FilterBar';
import { TradeDrawer } from '@/components/TradeDrawer';
import { PageHeader } from './PageHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/useSettings';
import { adjustCosts } from '@/domain/costs';
import { cssVar } from '@/theme/echartsApexTheme';
import type { Trade } from '@/domain/types';
import './Calendar.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ViewMode = 'month' | 'year';

function cellTone(pnl: number, count: number): React.CSSProperties {
  if (!count) return { background: 'var(--card)', color: 'var(--muted)' };
  const win = pnl >= 0;
  const base = win ? 'var(--profit)' : 'var(--danger)';
  return {
    background: `color-mix(in srgb, ${base} ${Math.min(28, 8 + count * 3)}%, var(--card))`,
    borderColor: `color-mix(in srgb, ${base} 45%, transparent)`,
  };
}

export function Calendar() {
  const all = useData((s) => s.trades);
  const filters = useFilters();
  const { mode: themeMode, accent: themeAccent } = useTheme();
  const tz = useSettings((s) => s.timezone);
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const cashFlows = useData((s) => s.cashFlows);
  const adjusted = useMemo(() => adjustCosts(all, { includeCommission, includeFees }), [all, includeCommission, includeFees]);
  const trades = useMemo(() => applyFilters(adjusted, filters), [adjusted, filters]);
  const map = useMemo(() => dayMap(trades, tz), [trades, tz]);
  const flowMap = useMemo(() => flowByDay(cashFlows), [cashFlows]);

  // default to most recent trade's month
  const latest = useMemo(() => {
    const dates = [...map.keys()].sort();
    return dates.length ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
  }, [map]);

  const [cursor, setCursor] = useState(() => ({ y: Number(latest.slice(0, 4)), m: Number(latest.slice(5, 7)) - 1 }));
  const [mode, setMode] = useState<ViewMode>('month');
  const [day, setDay] = useState<DayCell | null>(null);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);

  const grid = useMemo(() => monthGrid(map, cursor.y, cursor.m), [map, cursor]);

  const step = (d: number) => {
    setCursor((c) => {
      const m = c.m + d;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });
  };

  const heatOption: EChartsOption = useMemo(() => {
    const data = heatmapData(map).map(([dt, pnl]) => [dt, toMajor(pnl)] as [string, number]);
    const vals = data.map((d) => d[1]);
    const max = Math.max(1, ...vals.map(Math.abs));
    return {
      tooltip: {
        formatter: (p) => {
          const v = (p as unknown as { value: [string, number] }).value;
          return `${v[0]}<br/>${formatMoney(Math.round(v[1] * 100), { signed: true })}`;
        },
      },
      visualMap: {
        min: -max,
        max,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: [cssVar('--danger'), cssVar('--card'), cssVar('--profit')] },
        textStyle: { color: cssVar('--muted') },
      },
      calendar: {
        range: String(cursor.y),
        cellSize: ['auto', 16],
        top: 30,
        left: 40,
        right: 20,
        itemStyle: { color: cssVar('--card'), borderColor: cssVar('--line-soft'), borderWidth: 1 },
        splitLine: { lineStyle: { color: cssVar('--line') } },
        dayLabel: { color: cssVar('--muted') },
        monthLabel: { color: cssVar('--muted') },
        yearLabel: { show: false },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, cursor.y, themeMode, themeAccent]);

  if (all.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Calendar" title="PnL Calendar" />
        <EmptyState icon={<IconCalendar size={26} />} title="No trades yet" body="Import a .tlg or CSV file to light up your PnL calendar." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="PnL Calendar"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant={mode === 'month' ? 'primary' : 'ghost'} onClick={() => setMode('month')}>Month</Button>
            <Button variant={mode === 'year' ? 'primary' : 'ghost'} onClick={() => setMode('year')}>Year</Button>
          </div>
        }
      />
      <FilterBar />

      {mode === 'year' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button onClick={() => setCursor((c) => ({ ...c, y: c.y - 1 }))}>‹</Button>
            <span className="mono" style={{ fontWeight: 900, fontSize: '1.125rem' }}>{cursor.y}</span>
            <Button onClick={() => setCursor((c) => ({ ...c, y: c.y + 1 }))}>›</Button>
          </div>
          <ChartCard option={heatOption} height={220} />
        </div>
      ) : (
        <Card>
          <div className="apex-cal-head">
            <Button variant="icon" onClick={() => step(-1)} aria-label="Previous month">‹</Button>
            <div className="apex-cal-title">
              <span style={{ fontWeight: 900, fontSize: '1.125rem' }}>{MONTHS[cursor.m]} {cursor.y}</span>
              <span className="mono apex-cal-monthpnl" style={{ color: grid.monthPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>
                {formatMoney(grid.monthPnl, { signed: true })} · {grid.tradingDays} days
              </span>
            </div>
            <Button variant="icon" onClick={() => step(1)} aria-label="Next month">›</Button>
          </div>

          <div className="apex-cal-grid">
            {DOW.map((d) => (
              <div key={d} className="apex-cal-dow">{d}</div>
            ))}
            <div className="apex-cal-dow" style={{ color: 'var(--accent)' }}>Week</div>

            {grid.weeks.map((week, wi) => (
              <Week key={wi} week={week} weekPnl={grid.weekPnls[wi]} month={cursor.m} flowMap={flowMap} onPick={setDay} />
            ))}
          </div>
        </Card>
      )}

      {day && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 900 }}>
              {day.date} · <span className="mono" style={{ color: day.pnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>{formatMoney(day.pnl, { signed: true })}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{day.count} trades</span>
            </div>
            <Button variant="icon" onClick={() => setDay(null)} aria-label="Close">✕</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(flowMap.get(day.date)?.flows ?? []).map((cf) => (
              <span key={cf.id} className="apex-daychip mono" style={{ borderColor: cf.type === 'deposit' ? 'var(--profit)' : 'var(--danger)' }}>
                <span>{cf.type === 'deposit' ? '▲ Deposit' : '▼ Withdrawal'}</span>
                <span style={{ color: cf.type === 'deposit' ? 'var(--profit)' : 'var(--danger)' }}>{formatMoney(cf.amount)}</span>
              </span>
            ))}
            {day.trades.map((t) => (
              <button key={t.id} className="apex-daychip mono" onClick={() => setActiveTrade(t)}>
                <span>{t.symbol}</span>
                <span style={{ color: t.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>{formatMoney(t.netPnl, { signed: true })}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <TradeDrawer trade={activeTrade} onClose={() => setActiveTrade(null)} />
    </>
  );
}

function Week({ week, weekPnl, month, flowMap, onPick }: { week: (DayCell | null)[]; weekPnl: number; month: number; flowMap: FlowMap; onPick: (c: DayCell) => void }) {
  return (
    <>
      {week.map((cell, i) => {
        if (!cell) return <div key={i} className="apex-cal-cell apex-cal-cell--empty" />;
        const inMonth = Number(cell.date.slice(5, 7)) - 1 === month;
        const dayNum = Number(cell.date.slice(8, 10));
        const flow = flowMap.get(cell.date);
        const clickable = cell.count > 0 || !!flow;
        return (
          <button
            key={i}
            className="apex-cal-cell"
            style={{ ...cellTone(cell.pnl, cell.count), opacity: inMonth ? 1 : 0.4 }}
            onClick={() => clickable && onPick(cell)}
            disabled={!clickable}
          >
            <span className="apex-cal-daynum">
              {dayNum}
              {flow && <span className="apex-cal-flow" style={{ background: flow.net >= 0 ? 'var(--profit)' : 'var(--danger)' }} title={flow.net >= 0 ? 'Deposit' : 'Withdrawal'} />}
            </span>
            {cell.count > 0 && (
              <>
                <span className="apex-cal-pnl mono">{formatMoney(cell.pnl, { signed: true })}</span>
                <span className="apex-cal-count mono">{cell.count}t</span>
              </>
            )}
          </button>
        );
      })}
      <div className="apex-cal-week mono" style={{ color: weekPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>
        {weekPnl !== 0 ? formatMoney(weekPnl, { signed: true }) : '—'}
      </div>
    </>
  );
}
