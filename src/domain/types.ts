// Domain model (CLAUDE.md §3). Money is always integer minor units (cents/ticks).
// Timestamps are UTC ISO-8601 strings.

export type AssetType = 'stock' | 'future' | 'option' | 'forex' | 'crypto' | 'index';
export type Side = 'long' | 'short';
export type Action = 'buy' | 'sell';
export type CashFlowType = 'deposit' | 'withdrawal';
/** Native currency of a monetary record. Undefined legacy rows are treated as USD. */
export type Currency = 'USD' | 'EUR';

export interface CashFlow {
  id: string;
  date: string; // UTC ISO-8601 (midnight ok)
  type: CashFlowType;
  amount: number; // minor units, positive magnitude
  account: string;
  currency?: Currency; // native currency (undefined = USD)
  eurUsd?: number; // rate locked at entry time (USD per 1 EUR); overrides the live rate
  note?: string;
}

// Broker-reported open position (a snapshot at export time — NOT derived from fills).
// IB .tlg STK_LOT/OPT_LOT/FUT_LOT rows; aggregated per account+symbol.
export interface Position {
  id: string;            // `${account}|${assetType}|${symbol}` (stable; snapshot replaces)
  account: string;
  symbol: string;
  assetType: AssetType;
  qty: number;           // signed: + long, − short
  avgEntry: number;      // minor units, cost basis per unit
  multiplier: number;    // contract multiplier reported by the broker
  openDate: string | null; // UTC ISO; null when the broker omits it
  currency?: Currency;
}

export interface Execution {
  id: string;
  symbol: string;
  assetType: AssetType;
  account: string;
  timestamp: string; // UTC ISO-8601
  action: Action;
  quantity: number; // shares/contracts, always positive
  price: number; // minor units per unit (e.g. cents/share)
  commission: number; // minor units, positive magnitude
  fees: number; // minor units, positive magnitude
  currency?: Currency; // native currency of price/commission/fees (undefined = USD)
  brokerId?: string; // stable broker-side execution id (dedupe across re-imports)
  raw?: Record<string, string>;
}

export interface Trade {
  id: string;
  symbol: string;
  assetType: AssetType;
  account: string;
  side: Side;
  openDate: string; // UTC ISO
  closeDate: string | null; // null while open
  executions: Execution[];

  // derived
  qty: number; // peak position size
  avgEntry: number; // minor units per unit
  avgExit: number | null;
  grossPnl: number; // minor units
  netPnl: number; // gross - commission - fees
  commission: number;
  fees: number;
  returnPct: number; // on entry cost basis
  durationMs: number | null;
  isOpen: boolean;
  currency?: Currency; // native currency of all money fields (undefined = USD)

  // optional risk inputs
  stopLoss?: number;
  profitTarget?: number;
  rValue?: number;

  // optional intratrade analytics
  priceMAE?: number;
  priceMFE?: number;
  maxRunningPnl?: number;
  minRunningPnl?: number;

  // qualitative
  tags: string[];
  setup?: string;
  mistakes?: string[];
  notes?: string;
  rating?: number; // 1-5
}
