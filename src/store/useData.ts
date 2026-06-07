// Global data store (CLAUDE.md §2/§7). Holds reconstructed trades; reloads from IndexedDB.
// Primary data store: reconstructed trades + cash flows, backed by IndexedDB.
// Importing executions rebuilds the full trade set; mutations re-read from the db.
import { create } from 'zustand';
import type { CashFlow, Execution, Position, Trade } from '@/domain/types';
import { reconstructTrades } from '@/domain/reconstructTrades';
import {
  addExecutions,
  allCashFlows,
  allExecutions,
  allPositions,
  allTrades,
  deleteCashFlow,
  putCashFlow,
  replacePositions,
  replaceTrades,
  wipeAll,
  wipeCashFlowsData,
  wipeTradesData,
} from './db';

interface DataState {
  trades: Trade[];
  cashFlows: CashFlow[];
  positions: Position[];
  loading: boolean;
  load: () => Promise<void>;
  /**
   * Commit freshly parsed executions: dedupe-store, rebuild trades from the full set.
   * `positions` (broker-reported open lots) replace the snapshot when provided.
   */
  commitExecutions: (execs: Execution[], positions?: Position[]) => Promise<number>;
  addCashFlow: (cf: CashFlow) => Promise<void>;
  removeCashFlow: (id: string) => Promise<void>;
  wipeTrades: () => Promise<void>;
  wipeCashFlows: () => Promise<void>;
  wipe: () => Promise<void>;
}

async function rebuild(): Promise<Trade[]> {
  const execs = await allExecutions();
  const { trades } = reconstructTrades(execs);
  await replaceTrades(trades);
  return trades;
}

export const useData = create<DataState>((set) => ({
  trades: [],
  cashFlows: [],
  positions: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    const [trades, cashFlows, positions] = await Promise.all([allTrades(), allCashFlows(), allPositions()]);
    set({ trades, cashFlows, positions, loading: false });
  },
  commitExecutions: async (execs, positions) => {
    const added = await addExecutions(execs);
    const trades = await rebuild();
    // positions are an authoritative snapshot — replace only when the source carries one
    if (positions && positions.length > 0) {
      await replacePositions(positions);
      set({ trades, positions: await allPositions() });
    } else {
      set({ trades });
    }
    return added;
  },
  addCashFlow: async (cf) => {
    await putCashFlow(cf);
    set({ cashFlows: await allCashFlows() });
  },
  removeCashFlow: async (id) => {
    await deleteCashFlow(id);
    set({ cashFlows: await allCashFlows() });
  },
  wipeTrades: async () => {
    await wipeTradesData();
    set({ trades: [], positions: [] });
  },
  wipeCashFlows: async () => {
    await wipeCashFlowsData();
    set({ cashFlows: [] });
  },
  wipe: async () => {
    await wipeAll();
    set({ trades: [], cashFlows: [], positions: [] });
  },
}));
