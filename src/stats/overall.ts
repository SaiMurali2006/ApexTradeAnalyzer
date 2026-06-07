// Overall statistics (CLAUDE.md §4). Every value is a pure fn of a Trade[].
// Money in integer minor units; ratios are unitless; durations in ms.
import type { Trade } from '@/domain/types';
import { downsideDeviation, drawdown, equityCurve, mean, percentile, stdDev } from './series';
import { DEFAULT_TZ } from '@/lib/dates';

const TRADING_DAYS = 252;

export interface OverallStats {
  // performance
  netPnl: number;
  grossPnl: number;
  commission: number;
  fees: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number; // positive magnitude
  avgTrade: number;
  largestWin: number;
  largestLoss: number; // positive magnitude
  profitFactor: number;
  expectancy: number;
  winLossRatio: number;
  adjustedWinLossRatio: number;
  gainToPain: number;
  // risk-adjusted (daily series)
  sharpe: number;
  sortino: number;
  calmar: number;
  omega: number;
  recoveryFactor: number;
  // volatility & drawdown
  maxDrawdown: number;
  maxDrawdownPct: number;
  stdDevPnl: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  kelly: number;
  sqn: number;
  tailRatio: number;
  // duration / activity
  avgHoldMs: number;
  avgHoldWinMs: number;
  avgHoldLossMs: number;
  bestSymbol: string | null;
  worstSymbol: string | null;
}

function maxConsecutive(trades: Trade[], pred: (t: Trade) => boolean): number {
  let max = 0;
  let cur = 0;
  for (const t of trades) {
    if (pred(t)) {
      cur += 1;
      max = Math.max(max, cur);
    } else cur = 0;
  }
  return max;
}

export function computeOverallStats(input: Trade[], tz: string = DEFAULT_TZ): OverallStats {
  const trades = input.filter((t) => !t.isOpen);
  const n = trades.length;
  const pnls = trades.map((t) => t.netPnl);

  const winsArr = trades.filter((t) => t.netPnl > 0);
  const lossArr = trades.filter((t) => t.netPnl < 0);
  const be = trades.filter((t) => t.netPnl === 0);

  const grossProfit = winsArr.reduce((s, t) => s + t.netPnl, 0);
  const grossLossAbs = Math.abs(lossArr.reduce((s, t) => s + t.netPnl, 0));
  const netPnl = pnls.reduce((a, b) => a + b, 0);

  const winRate = n ? winsArr.length / n : 0;
  const lossRate = n ? lossArr.length / n : 0;
  const avgWin = winsArr.length ? grossProfit / winsArr.length : 0;
  const avgLoss = lossArr.length ? grossLossAbs / lossArr.length : 0;

  // series-derived
  const curve = equityCurve(trades, tz);
  const daily = curve.map((p) => p.pnl);
  const dd = drawdown(curve);
  const meanDaily = mean(daily);
  const sd = stdDev(daily);
  const downside = downsideDeviation(daily, 0);
  const posSum = daily.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const negSumAbs = Math.abs(daily.filter((x) => x < 0).reduce((a, b) => a + b, 0));

  // per-symbol pnl
  const bySym = new Map<string, number>();
  for (const t of trades) bySym.set(t.symbol, (bySym.get(t.symbol) ?? 0) + t.netPnl);
  let bestSymbol: string | null = null;
  let worstSymbol: string | null = null;
  let bestV = -Infinity;
  let worstV = Infinity;
  for (const [s, v] of bySym) {
    if (v > bestV) { bestV = v; bestSymbol = s; }
    if (v < worstV) { worstV = v; worstSymbol = s; }
  }

  const holds = trades.map((t) => t.durationMs ?? 0);
  const winHolds = winsArr.map((t) => t.durationMs ?? 0);
  const lossHolds = lossArr.map((t) => t.durationMs ?? 0);

  const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? Infinity : 0;
  const expectancy = winRate * avgWin - lossRate * avgLoss;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const kelly = winLossRatio > 0 && Number.isFinite(winLossRatio) ? winRate - lossRate / winLossRatio : 0;

  return {
    netPnl,
    grossPnl: trades.reduce((s, t) => s + t.grossPnl, 0),
    commission: trades.reduce((s, t) => s + t.commission, 0),
    fees: trades.reduce((s, t) => s + t.fees, 0),
    totalTrades: n,
    wins: winsArr.length,
    losses: lossArr.length,
    breakeven: be.length,
    winRate,
    lossRate,
    avgWin,
    avgLoss,
    avgTrade: n ? netPnl / n : 0,
    largestWin: winsArr.reduce((m, t) => Math.max(m, t.netPnl), 0),
    largestLoss: Math.abs(lossArr.reduce((m, t) => Math.min(m, t.netPnl), 0)),
    profitFactor,
    expectancy,
    winLossRatio,
    adjustedWinLossRatio: avgLoss * lossRate > 0 ? (avgWin * winRate) / (avgLoss * lossRate) : 0,
    gainToPain: negSumAbs > 0 ? posSum / negSumAbs : 0,
    sharpe: sd > 0 ? (meanDaily / sd) * Math.sqrt(TRADING_DAYS) : 0,
    sortino: downside > 0 ? (meanDaily / downside) * Math.sqrt(TRADING_DAYS) : 0,
    calmar: dd.maxDrawdown > 0 ? netPnl / dd.maxDrawdown : 0,
    omega: negSumAbs > 0 ? posSum / negSumAbs : 0,
    recoveryFactor: dd.maxDrawdown > 0 ? netPnl / dd.maxDrawdown : 0,
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownPct: dd.maxDrawdownPct,
    stdDevPnl: stdDev(pnls),
    maxConsecWins: maxConsecutive(trades, (t) => t.netPnl > 0),
    maxConsecLosses: maxConsecutive(trades, (t) => t.netPnl < 0),
    kelly,
    sqn: pnls.length > 1 && stdDev(pnls) > 0 ? (mean(pnls) / stdDev(pnls)) * Math.sqrt(pnls.length) : 0,
    tailRatio: percentile(daily, 0.05) !== 0 ? percentile(daily, 0.95) / Math.abs(percentile(daily, 0.05)) : 0,
    avgHoldMs: mean(holds),
    avgHoldWinMs: mean(winHolds),
    avgHoldLossMs: mean(lossHolds),
    bestSymbol,
    worstSymbol,
  };
}
