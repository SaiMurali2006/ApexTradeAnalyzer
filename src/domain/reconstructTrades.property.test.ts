// Property-based reconstruction tests (CLAUDE.md roadmap §37): throw random fill
// sequences at reconstructTrades and assert invariants that must hold for ANY input.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { reconstructTrades } from './reconstructTrades';
import type { Execution } from './types';

const BASE = Date.parse('2026-01-01T10:00:00.000Z');

interface Fill {
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  fees: number;
}

const fillArb: fc.Arbitrary<Fill> = fc.record({
  action: fc.constantFrom('buy', 'sell'),
  quantity: fc.integer({ min: 1, max: 500 }),
  price: fc.integer({ min: 1, max: 1_000_000 }), // minor units
  commission: fc.integer({ min: 0, max: 500 }),
  fees: fc.integer({ min: 0, max: 200 }),
});

// fills -> Execution[] (single stock/account; timestamps strictly increasing)
function toExecs(fills: Fill[]): Execution[] {
  return fills.map((f, i) => ({
    id: `e${i}`,
    symbol: 'AAPL',
    assetType: 'stock',
    account: 'main',
    timestamp: new Date(BASE + i * 60_000).toISOString(),
    action: f.action,
    quantity: f.quantity,
    price: f.price,
    commission: f.commission,
    fees: f.fees,
  }));
}

const finite = (n: number | null) => n === null || Number.isFinite(n);

describe('reconstructTrades — properties', () => {
  it('never produces NaN/Infinity and every trade is well-formed', () => {
    fc.assert(
      fc.property(fc.array(fillArb, { maxLength: 40 }), (fills) => {
        const execs = toExecs(fills);
        const { trades } = reconstructTrades(execs);
        for (const t of trades) {
          for (const v of [t.grossPnl, t.netPnl, t.commission, t.fees, t.qty, t.avgEntry, t.avgExit, t.returnPct, t.durationMs]) {
            expect(finite(v)).toBe(true);
          }
          expect(t.qty).toBeGreaterThan(0); // peak position size is always positive
          expect(t.executions.length).toBeGreaterThan(0);
          // costs are non-negative, so net never exceeds gross (±1 from independent rounding)
          expect(t.netPnl).toBeLessThanOrEqual(t.grossPnl + 1);
          if (t.isOpen) expect(t.closeDate).toBeNull();
          else expect(t.closeDate).not.toBeNull();
        }
        // every input execution is referenced by at least one trade
        const seen = new Set(trades.flatMap((t) => t.executions.map((e) => e.id)));
        for (const e of execs) expect(seen.has(e.id)).toBe(true);
      }),
    );
  });

  it('balanced sequences flatten: no open warnings, and Σ grossPnl = Σsell − Σbuy cash', () => {
    fc.assert(
      fc.property(fc.array(fillArb, { maxLength: 40 }), (fills) => {
        // force the net position flat by appending a corrective fill
        const net = fills.reduce((s, f) => s + (f.action === 'buy' ? f.quantity : -f.quantity), 0);
        const balanced = [...fills];
        if (net !== 0) {
          balanced.push({ action: net > 0 ? 'sell' : 'buy', quantity: Math.abs(net), price: 123_456, commission: 0, fees: 0 });
        }
        const execs = toExecs(balanced);
        const { trades, warnings } = reconstructTrades(execs);

        expect(warnings).toHaveLength(0); // nothing left open
        for (const t of trades) expect(t.isOpen).toBe(false);

        // cash-conservation oracle (stock multiplier = 1): realized PnL when flat is
        // exactly money received from sells minus money paid for buys.
        const cash = execs.reduce((s, e) => s + (e.action === 'sell' ? 1 : -1) * e.quantity * e.price, 0);
        const sumGross = trades.reduce((s, t) => s + t.grossPnl, 0);
        expect(sumGross).toBe(cash);
      }),
    );
  });
});
