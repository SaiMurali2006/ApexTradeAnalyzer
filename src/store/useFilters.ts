// Global filter bar state (CLAUDE.md §5.3). Drives every view.
import { create } from 'zustand';
import type { AssetType, Side, Trade } from '@/domain/types';

export type Outcome = 'all' | 'win' | 'loss';

export interface Filters {
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null;
  symbol: string; // substring match, '' = any
  account: string; // exact, '' = any
  assetType: AssetType | 'all';
  side: Side | 'all';
  outcome: Outcome;
  tags: string[]; // must include all
}

interface FilterState extends Filters {
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
}

const EMPTY: Filters = {
  dateFrom: null,
  dateTo: null,
  symbol: '',
  account: '',
  assetType: 'all',
  side: 'all',
  outcome: 'all',
  tags: [],
};

export const useFilters = create<FilterState>((set) => ({
  ...EMPTY,
  set: (patch) => set(patch),
  reset: () => set(EMPTY),
}));

export function applyFilters(trades: Trade[], f: Filters): Trade[] {
  const sym = f.symbol.trim().toUpperCase();
  return trades.filter((t) => {
    if (f.dateFrom && t.openDate.slice(0, 10) < f.dateFrom) return false;
    if (f.dateTo && t.openDate.slice(0, 10) > f.dateTo) return false;
    if (sym && !t.symbol.toUpperCase().includes(sym)) return false;
    if (f.account && t.account !== f.account) return false;
    if (f.assetType !== 'all' && t.assetType !== f.assetType) return false;
    if (f.side !== 'all' && t.side !== f.side) return false;
    if (f.outcome === 'win' && t.netPnl <= 0) return false;
    if (f.outcome === 'loss' && t.netPnl >= 0) return false;
    if (f.tags.length && !f.tags.every((tag) => t.tags.includes(tag))) return false;
    return true;
  });
}
