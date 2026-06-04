import { describe, expect, it } from 'vitest';
import { balanceCurve, flowByDay, netDeposits } from './cashflow';
import type { CashFlow, Trade } from '@/domain/types';

let id = 0;
const trade = (netPnl: number, date: string): Trade => ({
  id: `t${id++}`,
  symbol: 'AAPL',
  assetType: 'stock',
  account: 'main',
  side: 'long',
  openDate: `${date}T15:00:00.000Z`,
  closeDate: `${date}T16:00:00.000Z`,
  executions: [],
  qty: 1,
  avgEntry: 0,
  avgExit: 0,
  grossPnl: netPnl,
  netPnl,
  commission: 0,
  fees: 0,
  returnPct: 0,
  durationMs: 0,
  isOpen: false,
  tags: [],
});

const flow = (type: CashFlow['type'], amount: number, date: string): CashFlow => ({
  id: `c${id++}`,
  date: `${date}T00:00:00.000Z`,
  type,
  amount,
  account: 'main',
});

describe('cashflow', () => {
  it('netDeposits nets deposits against withdrawals', () => {
    expect(netDeposits([flow('deposit', 10000, '2026-01-01'), flow('withdrawal', 3000, '2026-01-05')])).toBe(7000);
  });

  it('flowByDay aggregates per day in tz', () => {
    const m = flowByDay([flow('deposit', 5000, '2026-01-02'), flow('deposit', 2000, '2026-01-02')]);
    expect(m.get('2026-01-02')).toMatchObject({ deposit: 7000, withdrawal: 0, net: 7000 });
  });

  it('balanceCurve seeds from starting balance and adds pnl + flows over time', () => {
    const trades = [trade(500, '2026-01-03'), trade(-200, '2026-01-04')];
    const flows = [flow('deposit', 10000, '2026-01-02'), flow('withdrawal', 1000, '2026-01-04')];
    const curve = balanceCurve(trades, flows, 100000); // start $1,000.00
    // 2026-01-02: +10000 deposit -> 110000
    expect(curve.find((p) => p.date === '2026-01-02')!.balance).toBe(110000);
    // 2026-01-03: +500 pnl -> 110500
    expect(curve.find((p) => p.date === '2026-01-03')!.balance).toBe(110500);
    // 2026-01-04: -200 pnl - 1000 withdrawal -> 109300
    expect(curve.find((p) => p.date === '2026-01-04')!.balance).toBe(109300);
  });
});
