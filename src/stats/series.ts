// Time-series helpers (CLAUDE.md §4/§5). All money stays integer minor units.
import type { Trade } from '@/domain/types';
import { dayKey, DEFAULT_TZ } from '@/lib/dates';

export interface EquityPoint {
  date: string; // YYYY-MM-DD
  pnl: number; // net PnL realized that day
  cumulative: number; // running total
}

/** Daily realized net PnL, sorted, with running cumulative total. Only closed trades count. */
export function equityCurve(trades: Trade[], tz: string = DEFAULT_TZ): EquityPoint[] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    if (t.isOpen) continue;
    const d = dayKey(t.closeDate ?? t.openDate, tz);
    byDay.set(d, (byDay.get(d) ?? 0) + t.netPnl);
  }
  const days = [...byDay.keys()].sort();
  let cum = 0;
  return days.map((date) => {
    const pnl = byDay.get(date)!;
    cum += pnl;
    return { date, pnl, cumulative: cum };
  });
}

/** Per-day net PnL values (closed trades), date-sorted. */
export function dailyPnl(trades: Trade[], tz: string = DEFAULT_TZ): number[] {
  return equityCurve(trades, tz).map((p) => p.pnl);
}

export interface Drawdown {
  maxDrawdown: number; // minor units, positive magnitude
  maxDrawdownPct: number; // fraction of peak
  longestDurationDays: number;
}

/** Max peak-to-trough drawdown on the cumulative equity curve. */
export function drawdown(curve: EquityPoint[]): Drawdown {
  let peak = 0;
  let maxDD = 0;
  let peakIdx = 0;
  let longest = 0;
  let peakValForPct = 0;
  for (let i = 0; i < curve.length; i++) {
    const v = curve[i].cumulative;
    if (v > peak) {
      peak = v;
      peakIdx = i;
    }
    const dd = peak - v;
    if (dd > maxDD) {
      maxDD = dd;
      peakValForPct = peak;
      longest = Math.max(longest, i - peakIdx);
    }
  }
  return {
    maxDrawdown: maxDD,
    maxDrawdownPct: peakValForPct > 0 ? maxDD / peakValForPct : 0,
    longestDurationDays: longest,
  };
}

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function stdDev(xs: number[], sample = true): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - (sample ? 1 : 0));
  return Math.sqrt(v);
}

/** percentile (0..1) via linear interpolation on a copy-sorted array. */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
