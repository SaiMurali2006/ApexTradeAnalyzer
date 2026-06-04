import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import { Card, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { ChartCard } from '@/components/ChartCard';
import { StatGrid } from '@/components/StatGrid';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from './PageHeader';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { useSettings } from '@/store/useSettings';
import { computeOverallStats } from '@/stats/overall';
import { equityCurve } from '@/stats/series';
import { adjustCosts } from '@/domain/costs';
import { formatMoney, formatPct, toMajor } from '@/domain/money';

export function Dashboard() {
  const all = useData((s) => s.trades);
  const filters = useFilters();
  const tz = useSettings((s) => s.timezone);
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const nav = useNavigate();

  const adjusted = useMemo(() => adjustCosts(all, { includeCommission, includeFees }), [all, includeCommission, includeFees]);
  const trades = useMemo(() => applyFilters(adjusted, filters), [adjusted, filters]);
  const stats = useMemo(() => computeOverallStats(trades, tz), [trades, tz]);
  const curve = useMemo(() => equityCurve(trades, tz), [trades, tz]);

  const equityOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoney(Math.round(Number(v) * 100)) },
      xAxis: { type: 'category', data: curve.map((p) => p.date), boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `$${v.toLocaleString()}` } },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: curve.map((p) => toMajor(p.cumulative)),
          areaStyle: { opacity: 0.18 },
          lineStyle: { width: 2 },
        },
      ],
    }),
    [curve],
  );

  if (all.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Dashboard" actions={<Button variant="primary" onClick={() => nav('/import')}>Import trades</Button>} />
        <Card style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
          No data yet — import a .tlg or CSV file to populate your dashboard.
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" actions={<Button variant="primary" onClick={() => nav('/import')}>Import trades</Button>} />
      <FilterBar />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
        <StatCard label="Net PnL" value={formatMoney(stats.netPnl, { signed: true })} tone={stats.netPnl >= 0 ? 'profit' : 'danger'} sub={`${stats.totalTrades} trades`} />
        <StatCard label="Win rate" value={formatPct(stats.winRate)} sub={`${stats.wins}W / ${stats.losses}L`} />
        <StatCard label="Profit factor" value={Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'} />
        <StatCard label="Expectancy" value={formatMoney(stats.expectancy, { signed: true })} tone={stats.expectancy >= 0 ? 'profit' : 'danger'} />
        <StatCard label="Max drawdown" value={formatMoney(-stats.maxDrawdown)} tone="danger" sub={formatPct(stats.maxDrawdownPct)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <ChartCard title="Equity curve (cumulative net PnL)" option={equityOption} height={300} />
      </div>

      <StatGrid s={stats} />
    </>
  );
}
