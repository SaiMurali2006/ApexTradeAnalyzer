// Dashboard: hero stat tiles, the equity/account-balance curve (with deposit/
// withdrawal markers when cash flows exist), and the full Overall Statistics grid.
// All driven by the global filters + cost/timezone settings.
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
import { balanceCurve, flowByDay, netDeposits } from '@/stats/cashflow';
import { adjustCosts } from '@/domain/costs';
import { cssVar } from '@/theme/echartsApexTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney, formatPct, toMajor, toMinor } from '@/domain/money';

export function Dashboard() {
  const all = useData((s) => s.trades);
  const cashFlows = useData((s) => s.cashFlows);
  const filters = useFilters();
  const tz = useSettings((s) => s.timezone);
  const startingBalance = useSettings((s) => s.startingBalance);
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const { mode, accent } = useTheme();
  const nav = useNavigate();

  const adjusted = useMemo(() => adjustCosts(all, { includeCommission, includeFees }), [all, includeCommission, includeFees]);
  const trades = useMemo(() => applyFilters(adjusted, filters), [adjusted, filters]);
  const stats = useMemo(() => computeOverallStats(trades, tz), [trades, tz]);
  const curve = useMemo(() => equityCurve(trades, tz), [trades, tz]);

  const startMinor = useMemo(() => toMinor(startingBalance), [startingBalance]);
  const hasCash = startMinor > 0 || cashFlows.length > 0;
  const netDep = useMemo(() => netDeposits(cashFlows), [cashFlows]);
  const balance = useMemo(() => balanceCurve(trades, cashFlows, startMinor, tz), [trades, cashFlows, startMinor, tz]);
  const currentBalance = startMinor + netDep + stats.netPnl;

  const equityOption: EChartsOption = useMemo(() => {
    const points = hasCash ? balance.map((p) => ({ date: p.date, v: p.balance })) : curve.map((p) => ({ date: p.date, v: p.cumulative }));
    const flows = flowByDay(cashFlows);
    const markData = [...flows.values()]
      .filter((fd) => points.some((p) => p.date === fd.date))
      .map((fd) => ({
        xAxis: fd.date,
        lineStyle: { color: fd.net >= 0 ? cssVar('--profit') : cssVar('--danger'), type: 'dashed' as const, width: 1.5 },
        label: {
          formatter: `${fd.net >= 0 ? '▲' : '▼'} ${formatMoney(Math.abs(fd.net), {})}`,
          color: fd.net >= 0 ? cssVar('--profit') : cssVar('--danger'),
          fontSize: 10,
        },
      }));
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoney(Math.round(Number(v) * 100)) },
      xAxis: { type: 'category', data: points.map((p) => p.date), boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `$${v.toLocaleString()}` } },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: points.map((p) => toMajor(p.v)),
          areaStyle: { opacity: 0.18 },
          lineStyle: { width: 2 },
          markLine: markData.length
            ? { symbol: 'none', data: markData, silent: false }
            : undefined,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve, balance, cashFlows, hasCash, tz, mode, accent]);

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
        {hasCash && <StatCard label="Account balance" value={formatMoney(currentBalance)} sub={`${formatMoney(netDep, { signed: true })} net deposited`} />}
      </div>

      <div style={{ marginBottom: 12 }}>
        <ChartCard title={hasCash ? 'Account balance (incl. deposits / withdrawals)' : 'Equity curve (cumulative net PnL)'} option={equityOption} height={300} />
      </div>

      <StatGrid s={stats} />
    </>
  );
}
