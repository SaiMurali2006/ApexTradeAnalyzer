// Chart aggregations (CLAUDE.md §5.4). Pure fns over Trade[]; money in minor units.
import type { Trade } from '@/domain/types';
import { equityCurve } from './series';
import { dowIndex, hourOf, DEFAULT_TZ } from '@/lib/dates';

export interface Bucket {
  key: string;
  pnl: number;
  count: number;
  wins: number;
}

function bucketize(trades: Trade[], keyFn: (t: Trade) => string): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const t of trades) {
    if (t.isOpen) continue;
    const key = keyFn(t);
    const b = m.get(key) ?? { key, pnl: 0, count: 0, wins: 0 };
    b.pnl += t.netPnl;
    b.count += 1;
    if (t.netPnl > 0) b.wins += 1;
    m.set(key, b);
  }
  return [...m.values()];
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function byDayOfWeek(trades: Trade[], tz: string = DEFAULT_TZ): Bucket[] {
  const buckets = bucketize(trades, (t) => DOW[dowIndex(t.closeDate ?? t.openDate, tz)]);
  return DOW.map((d) => buckets.find((b) => b.key === d) ?? { key: d, pnl: 0, count: 0, wins: 0 });
}

export function byHour(trades: Trade[], tz: string = DEFAULT_TZ): Bucket[] {
  const buckets = bucketize(trades, (t) => String(hourOf(t.openDate, tz)));
  return Array.from({ length: 24 }, (_, h) => buckets.find((b) => b.key === String(h)) ?? { key: String(h), pnl: 0, count: 0, wins: 0 });
}

export function bySymbol(trades: Trade[], limit = 15): Bucket[] {
  return bucketize(trades, (t) => t.symbol)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, limit);
}

export function byAsset(trades: Trade[]): Bucket[] {
  return bucketize(trades, (t) => t.assetType).sort((a, b) => b.pnl - a.pnl);
}

/** Symbols ranked by absolute PnL impact (keeps both big winners and big losers). */
export function bySymbolMagnitude(trades: Trade[], limit = 40): Bucket[] {
  return bucketize(trades, (t) => t.symbol)
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, limit);
}

export function byTag(trades: Trade[], limit = 15): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const t of trades) {
    if (t.isOpen || !t.tags.length) continue;
    for (const tag of t.tags) {
      const b = m.get(tag) ?? { key: tag, pnl: 0, count: 0, wins: 0 };
      b.pnl += t.netPnl;
      b.count += 1;
      if (t.netPnl > 0) b.wins += 1;
      m.set(tag, b);
    }
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl).slice(0, limit);
}

export interface HistBin {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

/** Histogram of per-trade net PnL (minor units), `bins` buckets across the range. */
export function pnlHistogram(trades: Trade[], bins = 21): HistBin[] {
  const pnls = trades.filter((t) => !t.isOpen).map((t) => t.netPnl);
  if (!pnls.length) return [];
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  if (min === max) return [{ label: String(min), lo: min, hi: max, count: pnls.length }];
  const width = (max - min) / bins;
  const out: HistBin[] = Array.from({ length: bins }, (_, i) => ({
    label: '',
    lo: min + i * width,
    hi: min + (i + 1) * width,
    count: 0,
  }));
  for (const p of pnls) {
    const idx = Math.min(bins - 1, Math.floor((p - min) / width));
    out[idx].count += 1;
  }
  return out.map((b) => ({ ...b, label: `${(b.lo / 100).toFixed(0)}` }));
}

/** Drawdown depth series (minor units, negative) aligned to the equity curve dates. */
export function drawdownSeries(trades: Trade[], tz: string = DEFAULT_TZ): { date: string; dd: number }[] {
  const curve = equityCurve(trades, tz);
  let peak = 0;
  return curve.map((p) => {
    peak = Math.max(peak, p.cumulative);
    return { date: p.date, dd: p.cumulative - peak };
  });
}
