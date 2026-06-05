import { describe, expect, it } from 'vitest';
import { computeOverallStats } from './overall';
import { downsideDeviation, drawdown, equityCurve, percentile, stdDev } from './series';
import type { Trade } from '@/domain/types';

let id = 0;
function trade(netPnl: number, date: string, opts: Partial<Trade> = {}): Trade {
  return {
    id: `t${id++}`,
    symbol: opts.symbol ?? 'AAPL',
    assetType: 'stock',
    account: 'main',
    side: 'long',
    openDate: `${date}T10:00:00.000Z`,
    closeDate: `${date}T11:00:00.000Z`,
    executions: [],
    qty: 100,
    avgEntry: 10000,
    avgExit: 10000 + netPnl,
    grossPnl: netPnl,
    netPnl,
    commission: 0,
    fees: 0,
    returnPct: 0,
    durationMs: 60 * 60 * 1000,
    isOpen: false,
    tags: [],
    ...opts,
  };
}

describe('series', () => {
  it('equityCurve aggregates by day and accumulates', () => {
    const c = equityCurve([trade(100, '2026-01-01'), trade(-40, '2026-01-01'), trade(50, '2026-01-02')]);
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ date: '2026-01-01', pnl: 60, cumulative: 60 });
    expect(c[1]).toMatchObject({ date: '2026-01-02', pnl: 50, cumulative: 110 });
  });

  it('drawdown finds peak-to-trough', () => {
    const c = equityCurve([trade(100, '2026-01-01'), trade(-60, '2026-01-02'), trade(10, '2026-01-03')]);
    const dd = drawdown(c);
    expect(dd.maxDrawdown).toBe(60); // peak 100 -> trough 40
    expect(dd.maxDrawdownPct).toBeCloseTo(0.6, 5);
  });

  it('stdDev and percentile', () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(2, 5);
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 5);
  });

  it('downsideDeviation is RMS of shortfalls below MAR=0', () => {
    // negatives -3,-4 -> sqrt((9+16)/5) over 5 points (positives contribute 0)
    expect(downsideDeviation([10, 5, -3, 2, -4])).toBeCloseTo(Math.sqrt((9 + 16) / 5), 6);
    expect(downsideDeviation([1, 2, 3])).toBe(0); // no shortfalls
  });
});

describe('computeOverallStats', () => {
  const trades = [
    trade(300, '2026-01-01'),
    trade(-100, '2026-01-02'),
    trade(200, '2026-01-03'),
    trade(-100, '2026-01-04'),
  ];
  const s = computeOverallStats(trades);

  it('counts and rates', () => {
    expect(s.totalTrades).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.winRate).toBe(0.5);
  });

  it('profit factor = grossProfit / grossLoss', () => {
    expect(s.profitFactor).toBeCloseTo(500 / 200, 5); // 2.5
  });

  it('expectancy = winRate*avgWin - lossRate*avgLoss', () => {
    // avgWin=250, avgLoss=100 -> 0.5*250 - 0.5*100 = 75
    expect(s.expectancy).toBeCloseTo(75, 5);
  });

  it('net pnl and avg trade', () => {
    expect(s.netPnl).toBe(300);
    expect(s.avgTrade).toBe(75);
  });

  it('consecutive streaks', () => {
    const t2 = [trade(10, '2026-02-01'), trade(10, '2026-02-02'), trade(-5, '2026-02-03'), trade(-5, '2026-02-04'), trade(-5, '2026-02-05')];
    const r = computeOverallStats(t2);
    expect(r.maxConsecWins).toBe(2);
    expect(r.maxConsecLosses).toBe(3);
  });

  it('best/worst symbol', () => {
    const r = computeOverallStats([trade(500, '2026-03-01', { symbol: 'NVDA' }), trade(-300, '2026-03-02', { symbol: 'INTC' })]);
    expect(r.bestSymbol).toBe('NVDA');
    expect(r.worstSymbol).toBe('INTC');
  });

  it('ignores open trades', () => {
    const r = computeOverallStats([trade(100, '2026-04-01'), trade(0, '2026-04-02', { isOpen: true, closeDate: null, netPnl: 0 })]);
    expect(r.totalTrades).toBe(1);
  });
});
