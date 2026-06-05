// Cost-inclusion adjustment (Settings). Recomputes each trade's netPnl from gross
// minus the cost components the user chose to include. All downstream stats read
// netPnl, so adjusting it here flows through filters, calendar, charts, and metrics.
import type { Trade } from './types';
import { contractMultiplier } from './multipliers';

export interface CostOptions {
  includeCommission: boolean;
  includeFees: boolean;
}

/** Effective net PnL for a trade given which cost components are included. */
export function effectivePnl(t: Trade, opts: CostOptions): number {
  return t.grossPnl - (opts.includeCommission ? t.commission : 0) - (opts.includeFees ? t.fees : 0);
}

/** Return trades with netPnl/returnPct recomputed per the cost options. */
export function adjustCosts(trades: Trade[], opts: CostOptions): Trade[] {
  // fast path: nothing excluded -> stored values already correct
  if (opts.includeCommission && opts.includeFees) return trades;
  return trades.map((t) => {
    const netPnl = effectivePnl(t, opts);
    // match reconstructTrades: cost basis includes the contract multiplier
    const costBasis = t.avgEntry * t.qty * contractMultiplier(t.assetType, t.symbol);
    return {
      ...t,
      netPnl,
      returnPct: costBasis !== 0 ? netPnl / costBasis : t.returnPct,
    };
  });
}
