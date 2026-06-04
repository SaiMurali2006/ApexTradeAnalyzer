import { describe, expect, it } from 'vitest';
import { formatMoney, formatPct, toMajor, toMinor } from './money';

describe('money', () => {
  it('toMinor avoids float drift', () => {
    expect(toMinor(19.99)).toBe(1999);
    expect(toMinor('1,234.56')).toBe(123456);
    expect(toMinor(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
  });

  it('toMajor round-trips', () => {
    expect(toMajor(123456)).toBe(1234.56);
  });

  it('formats money with sign', () => {
    expect(formatMoney(50000)).toBe('$500.00');
    expect(formatMoney(50000, { signed: true })).toBe('+$500.00');
    expect(formatMoney(-50000)).toBe('-$500.00');
  });

  it('formats percentages', () => {
    expect(formatPct(0.583)).toBe('58.3%');
  });
});
