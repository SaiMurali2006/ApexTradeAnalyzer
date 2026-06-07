import { describe, expect, it } from 'vitest';
import { convertMinor, convertCashFlows, convertTrades } from './currency';
import type { CashFlow, Trade } from './types';

const RATE = 1.1; // USD per 1 EUR

describe('convertMinor', () => {
  it('EUR → USD multiplies by rate', () => {
    expect(convertMinor(10000, 'EUR', 'USD', RATE)).toBe(11000);
  });
  it('USD → EUR divides by rate', () => {
    expect(convertMinor(11000, 'USD', 'EUR', RATE)).toBe(10000);
  });
  it('same currency is a no-op', () => {
    expect(convertMinor(12345, 'USD', 'USD', RATE)).toBe(12345);
  });
  it('undefined native treated as USD', () => {
    expect(convertMinor(10000, undefined, 'EUR', RATE)).toBe(Math.round(10000 / RATE));
  });
});

describe('convertTrades', () => {
  const t = {
    id: 't1', symbol: 'X', assetType: 'stock', account: 'a', side: 'long',
    openDate: '2026-01-01T10:00:00Z', closeDate: '2026-01-01T11:00:00Z', executions: [],
    qty: 1, avgEntry: 10000, avgExit: 12000, grossPnl: 2000, netPnl: 1800,
    commission: 200, fees: 0, returnPct: 0.2, durationMs: 1, isOpen: false, currency: 'EUR', tags: [],
  } as Trade;

  it('converts money fields EUR → USD', () => {
    const [c] = convertTrades([t], 'USD', RATE);
    expect(c.netPnl).toBe(1980);
    expect(c.grossPnl).toBe(2200);
    expect(c.currency).toBe('USD');
  });
});

describe('convertCashFlows', () => {
  it('uses each flow locked rate when present, else the live rate', () => {
    const flows: CashFlow[] = [
      { id: 'a', date: '2026-01-01T00:00:00Z', type: 'deposit', amount: 10000, account: '', currency: 'EUR', eurUsd: 1.2 },
      { id: 'b', date: '2026-01-02T00:00:00Z', type: 'deposit', amount: 10000, account: '', currency: 'EUR' },
    ];
    const out = convertCashFlows(flows, 'USD', RATE);
    expect(out[0].amount).toBe(12000); // locked 1.2
    expect(out[1].amount).toBe(11000); // live 1.1
  });
});
