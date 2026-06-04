// Domain model (CLAUDE.md §3). Money is always integer minor units (cents/ticks).
// Timestamps are UTC ISO-8601 strings.

export type AssetType = 'stock' | 'future' | 'option' | 'forex' | 'crypto' | 'index';
export type Side = 'long' | 'short';
export type Action = 'buy' | 'sell';

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
