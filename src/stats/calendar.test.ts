import { describe, expect, it } from 'vitest';
import { dayMap, monthGrid } from './calendar';
import type { Trade } from '@/domain/types';

let id = 0;
const trade = (netPnl: number, closeDate: string): Trade => ({
  id: `t${id++}`,
  symbol: 'AAPL',
  assetType: 'stock',
  account: 'main',
  side: 'long',
  openDate: `${closeDate}T10:00:00.000Z`,
  closeDate: `${closeDate}T11:00:00.000Z`,
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

describe('calendar', () => {
  it('buckets trades by realized day', () => {
    const m = dayMap([trade(100, '2026-01-05'), trade(-30, '2026-01-05'), trade(50, '2026-01-06')]);
    expect(m.get('2026-01-05')).toMatchObject({ pnl: 70, count: 2 });
    expect(m.get('2026-01-06')!.pnl).toBe(50);
  });

  it('builds a month grid with correct padding and week sums', () => {
    // Jan 2026: Jan 1 is a Thursday (dow 4)
    const m = dayMap([trade(200, '2026-01-01'), trade(100, '2026-01-02')]);
    const g = monthGrid(m, 2026, 0);
    expect(g.weeks[0].slice(0, 4).every((c) => c === null)).toBe(true); // Sun-Wed padding
    expect(g.weeks[0][4]?.date).toBe('2026-01-01');
    expect(g.monthPnl).toBe(300);
    expect(g.tradingDays).toBe(2);
    expect(g.weekPnls[0]).toBe(300);
  });
});
