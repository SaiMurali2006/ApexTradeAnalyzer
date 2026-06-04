import { describe, expect, it } from 'vitest';
import { reconstructTrades } from './reconstructTrades';
import type { Execution } from './types';

let n = 0;
function ex(p: Partial<Execution>): Execution {
  return {
    id: `e${n++}`,
    symbol: 'AAPL',
    assetType: 'stock',
    account: 'main',
    timestamp: '2026-01-01T10:00:00.000Z',
    action: 'buy',
    quantity: 100,
    price: 10000, // $100.00 in cents
    commission: 0,
    fees: 0,
    ...p,
  };
}

describe('reconstructTrades', () => {
  it('simple long round-trip computes gross/net PnL', () => {
    const { trades } = reconstructTrades([
      ex({ action: 'buy', quantity: 100, price: 10000, timestamp: '2026-01-01T10:00:00Z', commission: 100 }),
      ex({ action: 'sell', quantity: 100, price: 10500, timestamp: '2026-01-01T11:00:00Z', commission: 100 }),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.side).toBe('long');
    expect(t.grossPnl).toBe(50000); // 100 * (10500-10000) = 50000 cents = $500
    expect(t.netPnl).toBe(50000 - 200);
    expect(t.qty).toBe(100);
    expect(t.avgEntry).toBe(10000);
    expect(t.avgExit).toBe(10500);
    expect(t.isOpen).toBe(false);
    expect(t.durationMs).toBe(60 * 60 * 1000);
  });

  it('short round-trip: profit when price falls', () => {
    const { trades } = reconstructTrades([
      ex({ action: 'sell', quantity: 10, price: 5000, timestamp: '2026-01-02T10:00:00Z' }),
      ex({ action: 'buy', quantity: 10, price: 4800, timestamp: '2026-01-02T12:00:00Z' }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('short');
    expect(trades[0].grossPnl).toBe(10 * (5000 - 4800)); // 2000
  });

  it('scaling in averages the entry', () => {
    const { trades } = reconstructTrades([
      ex({ action: 'buy', quantity: 100, price: 10000, timestamp: '2026-01-03T10:00:00Z' }),
      ex({ action: 'buy', quantity: 100, price: 11000, timestamp: '2026-01-03T10:30:00Z' }),
      ex({ action: 'sell', quantity: 200, price: 12000, timestamp: '2026-01-03T11:00:00Z' }),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.avgEntry).toBe(10500);
    expect(t.qty).toBe(200);
    expect(t.grossPnl).toBe(200 * (12000 - 10500)); // 300000
  });

  it('reversal closes one trade and opens another', () => {
    const { trades } = reconstructTrades([
      ex({ action: 'buy', quantity: 100, price: 10000, timestamp: '2026-01-04T10:00:00Z' }),
      ex({ action: 'sell', quantity: 200, price: 10500, timestamp: '2026-01-04T11:00:00Z' }), // close 100 long, open 100 short
      ex({ action: 'buy', quantity: 100, price: 10300, timestamp: '2026-01-04T12:00:00Z' }), // close short
    ]);
    expect(trades).toHaveLength(2);
    const [a, c] = trades;
    expect(a.side).toBe('long');
    expect(a.grossPnl).toBe(100 * (10500 - 10000)); // 50000
    expect(c.side).toBe('short');
    expect(c.grossPnl).toBe(100 * (10500 - 10300)); // 20000
  });

  it('options apply the 100x multiplier', () => {
    const { trades } = reconstructTrades([
      ex({ assetType: 'option', symbol: 'AAPL  260116C00150000', action: 'buy', quantity: 1, price: 200, timestamp: '2026-01-05T10:00:00Z' }),
      ex({ assetType: 'option', symbol: 'AAPL  260116C00150000', action: 'sell', quantity: 1, price: 350, timestamp: '2026-01-05T11:00:00Z' }),
    ]);
    expect(trades[0].grossPnl).toBe(1 * (350 - 200) * 100); // 15000 cents = $150
  });

  it('futures apply the per-symbol point value (ES = 50)', () => {
    const { trades } = reconstructTrades([
      ex({ assetType: 'future', symbol: 'ESZ4', action: 'buy', quantity: 1, price: 500000, timestamp: '2026-01-06T10:00:00Z' }),
      ex({ assetType: 'future', symbol: 'ESZ4', action: 'sell', quantity: 1, price: 500200, timestamp: '2026-01-06T11:00:00Z' }),
    ]);
    // price move 200 cents * qty 1 * pointValue 50 = 10000 cents = $100
    expect(trades[0].grossPnl).toBe(200 * 1 * 50);
  });

  it('open position is flagged and warned', () => {
    const { trades, warnings } = reconstructTrades([
      ex({ action: 'buy', quantity: 100, price: 10000, timestamp: '2026-01-07T10:00:00Z' }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].isOpen).toBe(true);
    expect(trades[0].closeDate).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it('separates trades by symbol and account', () => {
    const { trades } = reconstructTrades([
      ex({ symbol: 'AAPL', account: 'a', action: 'buy', quantity: 1, price: 100, timestamp: '2026-01-08T10:00:00Z' }),
      ex({ symbol: 'AAPL', account: 'a', action: 'sell', quantity: 1, price: 110, timestamp: '2026-01-08T11:00:00Z' }),
      ex({ symbol: 'MSFT', account: 'b', action: 'buy', quantity: 1, price: 200, timestamp: '2026-01-08T10:00:00Z' }),
      ex({ symbol: 'MSFT', account: 'b', action: 'sell', quantity: 1, price: 190, timestamp: '2026-01-08T11:00:00Z' }),
    ]);
    expect(trades).toHaveLength(2);
  });
});
