// Contract multipliers (CLAUDE.md §3). PnL per unit of price move depends on asset.
// stock/index/crypto/forex = 1 share-equivalent; options = 100; futures = per-symbol point value.
import type { AssetType } from './types';

// Futures point value (dollars per 1.0 price move per contract). Extend as needed;
// configurable in Settings at runtime. Keyed by root symbol (strip month/year codes).
export const FUTURES_POINT_VALUE: Record<string, number> = {
  ES: 50, // E-mini S&P 500
  MES: 5, // Micro E-mini S&P 500
  NQ: 20, // E-mini Nasdaq 100
  MNQ: 2, // Micro E-mini Nasdaq 100
  YM: 5, // E-mini Dow
  MYM: 0.5,
  RTY: 50, // E-mini Russell 2000
  CL: 1000, // Crude oil
  MCL: 100,
  GC: 100, // Gold
  MGC: 10,
  SI: 5000, // Silver
  ZB: 1000, // 30Y T-Bond
  ZN: 1000, // 10Y T-Note
  '6E': 125000, // Euro FX
};

const OPTION_MULTIPLIER = 100;

// Runtime overrides from user Settings (root symbol -> point value). Checked first.
let futuresOverrides: Record<string, number> = {};
export function applyFuturesOverrides(map: Record<string, number>): void {
  futuresOverrides = { ...map };
}

/** Strip a futures contract month/year suffix to the root (e.g. ESZ4 -> ES, MNQH25 -> MNQ). */
export function futuresRoot(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  // root = leading letters/digits before a trailing month-code+year pattern
  const m = s.match(/^([A-Z0-9]+?)[FGHJKMNQUVXZ]\d{1,2}$/);
  return m ? m[1] : s;
}

/** Dollars-per-unit multiplier for an instrument. */
export function contractMultiplier(assetType: AssetType, symbol: string): number {
  switch (assetType) {
    case 'option':
      return OPTION_MULTIPLIER;
    case 'future': {
      const root = futuresRoot(symbol);
      return futuresOverrides[root] ?? FUTURES_POINT_VALUE[root] ?? 1;
    }
    default:
      return 1; // stock, index, crypto, forex
  }
}
