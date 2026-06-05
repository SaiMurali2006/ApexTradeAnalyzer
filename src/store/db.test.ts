import { describe, expect, it } from 'vitest';
import { execHash } from './db';
import type { Execution } from '@/domain/types';

function ex(p: Partial<Execution>): Execution {
  return {
    id: 'react-key-volatile',
    symbol: 'AAPL',
    assetType: 'stock',
    account: 'IB',
    timestamp: '2026-01-01T10:00:00.000Z',
    action: 'buy',
    quantity: 100,
    price: 10000,
    commission: 100,
    fees: 0,
    ...p,
  };
}

describe('execHash (dedupe)', () => {
  it('ignores the volatile React id — same fill re-imported hashes identically', () => {
    const a = ex({ id: 'tlg-abc-0', brokerId: '12345' });
    const b = ex({ id: 'tlg-abc-9999', brokerId: '12345' }); // re-import: different counter
    expect(execHash(a)).toBe(execHash(b));
  });

  it('different broker ids disambiguate otherwise-identical fills', () => {
    expect(execHash(ex({ brokerId: '1' }))).not.toBe(execHash(ex({ brokerId: '2' })));
  });

  it('content differences change the hash (no brokerId / CSV path)', () => {
    expect(execHash(ex({ price: 10000 }))).not.toBe(execHash(ex({ price: 10100 })));
    expect(execHash(ex({ quantity: 100 }))).not.toBe(execHash(ex({ quantity: 50 })));
  });
});
