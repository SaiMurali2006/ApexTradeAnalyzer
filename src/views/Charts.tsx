// Charts: symbol-performance bubble chart plus PnL distribution, drawdown, and
// breakdowns by day-of-week / hour / symbol / asset. Click a bar or bubble to filter.
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { useData } from '@/store/useData';
import { applyFilters, useFilters } from '@/store/useFilters';
import { byAsset, byDayOfWeek, byHour, bySymbol, bySymbolMagnitude, drawdownSeries, pnlHistogram, type Bucket } from '@/stats/breakdowns';
import { adjustCosts } from '@/domain/costs';
import { convertTrades } from '@/domain/currency';
import { useRates } from '@/store/useRates';
import type { Currency } from '@/domain/types';
import { formatMoney, toMajor } from '@/domain/money';
import { ChartCard } from '@/components/ChartCard';
import { FilterBar } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { IconChart } from '@/components/Icon';
import { PageHeader } from './PageHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/useSettings';
import { cssVar } from '@/theme/echartsApexTheme';

const moneyAxis = (v: number) => `$${v.toLocaleString()}`;

interface Palette {
  profit: string;
  danger: string;
  accent: string;
}

function barOption(buckets: Bucket[], pal: Palette, rotate = 0): EChartsOption {
  const vals = buckets.map((b) => toMajor(b.pnl));
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (p) => {
        const a = (Array.isArray(p) ? p[0] : p) as { name: string; dataIndex: number };
        const b = buckets[a.dataIndex];
        return `${a.name}<br/>${formatMoney(b.pnl, { signed: true })}<br/>${b.count} trades · ${b.count ? Math.round((b.wins / b.count) * 100) : 0}% win`;
      },
    },
    xAxis: { type: 'category', data: buckets.map((b) => b.key), axisLabel: { rotate } },
    yAxis: { type: 'value', axisLabel: { formatter: moneyAxis } },
    series: [
      {
        type: 'bar',
        data: vals.map((v) => ({ value: v, itemStyle: { color: v >= 0 ? pal.profit : pal.danger, borderRadius: [4, 4, 0, 0] } })),
      },
    ],
  };
}

export function Charts() {
  const all = useData((s) => s.trades);
  const filters = useFilters();
  const f = useFilters((s) => s.set);
  const { mode, accent } = useTheme();
  const tz = useSettings((s) => s.timezone);
  const includeCommission = useSettings((s) => s.includeCommission);
  const includeFees = useSettings((s) => s.includeFees);
  const currency = useSettings((s) => s.currency);
  const eurUsd = useRates((s) => s.eurUsd);
  const displayCcy: Currency = currency === 'EUR' ? 'EUR' : 'USD';
  const adjusted = useMemo(() => convertTrades(adjustCosts(all, { includeCommission, includeFees }), displayCcy, eurUsd), [all, includeCommission, includeFees, displayCcy, eurUsd]);
  const trades = useMemo(() => applyFilters(adjusted, filters), [adjusted, filters]);

  // resolved palette — recomputed on theme change so canvas colors stay valid
  const pal: Palette = useMemo(
    () => ({ profit: cssVar('--profit'), danger: cssVar('--danger'), accent: cssVar('--accent') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, accent],
  );

  const dow = useMemo(() => byDayOfWeek(trades, tz), [trades, tz]);
  const hour = useMemo(() => byHour(trades, tz), [trades, tz]);
  const sym = useMemo(() => bySymbol(trades), [trades]);
  const asset = useMemo(() => byAsset(trades), [trades]);
  const hist = useMemo(() => pnlHistogram(trades), [trades]);
  const dd = useMemo(() => drawdownSeries(trades, tz), [trades, tz]);

  const histOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: hist.map((b) => b.label), name: 'Net PnL ($)', nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: 'Trades' },
      series: [
        {
          type: 'bar',
          data: hist.map((b) => ({ value: b.count, itemStyle: { color: b.hi <= 0 ? pal.danger : b.lo >= 0 ? pal.profit : pal.accent, borderRadius: [3, 3, 0, 0] } })),
          barCategoryGap: '8%',
        },
      ],
    }),
    [hist, pal],
  );

  const ddOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoney(Math.round(Number(v) * 100)) },
      xAxis: { type: 'category', data: dd.map((p) => p.date), boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { formatter: moneyAxis } },
      series: [{ type: 'line', showSymbol: false, areaStyle: { opacity: 0.2, color: pal.danger }, lineStyle: { color: pal.danger, width: 1.5 }, data: dd.map((p) => toMajor(p.dd)) }],
    }),
    [dd, pal],
  );

  const symOption = useMemo(() => barOption(sym, pal, 0), [sym, pal]);
  const dowOption = useMemo(() => barOption(dow, pal), [dow, pal]);
  const hourOption = useMemo(() => barOption(hour, pal), [hour, pal]);
  const assetOption = useMemo(() => barOption(asset, pal), [asset, pal]);

  const bubbles = useMemo(() => bySymbolMagnitude(trades, 50), [trades]);
  const bubbleOption: EChartsOption = useMemo(() => {
    const maxAbs = Math.max(1, ...bubbles.map((b) => Math.abs(toMajor(b.pnl))));
    const data = bubbles.map((b) => ({
      // [winRate%, pnl$, count, symbol]
      value: [b.count ? (b.wins / b.count) * 100 : 0, toMajor(b.pnl), b.count, b.key],
    }));
    return {
      grid: { top: 24, right: 28, bottom: 48, left: 64 },
      tooltip: {
        formatter: (p) => {
          const d = (p as unknown as { value: [number, number, number, string] }).value;
          return `<b>${d[3]}</b><br/>${formatMoney(Math.round(d[1] * 100), { signed: true })}<br/>${Math.round(d[0])}% win · ${d[2]} trades`;
        },
      },
      xAxis: { type: 'value', name: 'Win rate', min: 0, max: 100, nameLocation: 'middle', nameGap: 30, axisLabel: { formatter: (v: number) => `${v}%` } },
      yAxis: { type: 'value', name: 'Net PnL', axisLabel: { formatter: moneyAxis } },
      visualMap: {
        show: false,
        type: 'continuous',
        dimension: 1,
        min: -maxAbs,
        max: maxAbs,
        // diverging red -> gray -> green; gray midpoint avoids the near-black surface tones
        inRange: { color: [pal.danger, cssVar('--muted'), pal.profit] },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => 12 + Math.sqrt(val[2]) * 7,
          data,
          emphasis: { focus: 'self', scale: 1.15 },
          itemStyle: { opacity: 0.95, borderColor: cssVar('--card'), borderWidth: 1 },
          label: {
            show: true,
            position: 'inside',
            formatter: (p) => String((p as unknown as { value: (string | number)[] }).value[3]),
            color: cssVar('--text'),
            fontSize: 9,
            fontWeight: 'bold',
          },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbles, pal, mode, accent]);

  if (all.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Analytics" title="Charts" />
        <EmptyState icon={<IconChart size={26} />} title="No trades yet" body="Import a .tlg or CSV file to explore your performance charts." />
      </>
    );
  }

  const symClick = { click: (p: unknown) => f({ symbol: (p as { name: string }).name }) };
  const bubbleClick = { click: (p: unknown) => f({ symbol: String((p as { value: (string | number)[] }).value[3]) }) };

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Charts" />
      <FilterBar />
      <div style={{ marginBottom: 12 }}>
        <ChartCard
          title="Symbol performance — size = trades, greener = more profit, redder = more loss"
          option={bubbleOption}
          height={360}
          events={bubbleClick}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
        <ChartCard title="PnL distribution" option={histOption} />
        <ChartCard title="Drawdown" option={ddOption} />
        <ChartCard title="PnL by day of week" option={dowOption} />
        <ChartCard title="PnL by hour of day (open)" option={hourOption} />
        <ChartCard title="PnL by symbol (top 15) — click to filter" option={symOption} events={symClick} />
        <ChartCard title="PnL by asset type" option={assetOption} />
      </div>
    </>
  );
}
