import { describe, expect, it } from 'vitest';
import { adjustCosts, effectivePnl } from './costs';
import type { Trade } from './types';

let id = 0;
function trade(p: Partial<Trade>): Trade {
  return {
    id: `t${id++}`,
    symbol: 'AAPL',
    assetType: 'stock',
    account: 'main',
    side: 'long',
    openDate: '2026-01-01T10:00:00.000Z',
    closeDate: '2026-01-01T11:00:00.000Z',
    executions: [],
    qty: 100,
    avgEntry: 10000,
    avgExit: 10500,
    grossPnl: 50000,
    netPnl: 49800,
    commission: 150,
    fees: 50,
    returnPct: 0.05,
    durationMs: 3_600_000,
    isOpen: false,
    tags: [],
    ...p,
  };
}

describe('costs', () => {
  it('fast-path returns the same array when both costs included', () => {
    const ts = [trade({})];
    expect(adjustCosts(ts, { includeCommission: true, includeFees: true })).toBe(ts);
  });

  it('excluding costs reverts netPnl toward gross', () => {
    const [t] = adjustCosts([trade({})], { includeCommission: false, includeFees: false });
    expect(t.netPnl).toBe(50000); // gross
    expect(effectivePnl(trade({}), { includeCommission: true, includeFees: false })).toBe(49850);
  });

  it('returnPct cost basis includes the option x100 multiplier', () => {
    // option: avgEntry 200c, qty 1 -> basis = 200 * 1 * 100 = 20000c ; gross 15000c
    const [t] = adjustCosts(
      [trade({ assetType: 'option', symbol: 'AAPL  260116C00150000', avgEntry: 200, qty: 1, grossPnl: 15000, commission: 100, fees: 0 })],
      { includeCommission: false, includeFees: true },
    );
    expect(t.netPnl).toBe(15000);
    expect(t.returnPct).toBeCloseTo(15000 / 20000, 6); // 0.75, NOT 75 (would be wrong without mult)
  });
});
