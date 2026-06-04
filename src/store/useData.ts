// Global data store (CLAUDE.md §2/§7). Holds reconstructed trades; reloads from IndexedDB.
// Primary data store: reconstructed trades + cash flows, backed by IndexedDB.
// Importing executions rebuilds the full trade set; mutations re-read from the db.
import { create } from 'zustand';
import type { CashFlow, Execution, Trade } from '@/domain/types';
import { reconstructTrades } from '@/domain/reconstructTrades';
import {
  addExecutions,
  allCashFlows,
  allExecutions,
  allTrades,
  deleteCashFlow,
  putCashFlow,
  replaceTrades,
  wipeAll,
} from './db';

interface DataState {
  trades: Trade[];
  cashFlows: CashFlow[];
  loading: boolean;
  load: () => Promise<void>;
  /** Commit freshly parsed executions: dedupe-store, rebuild trades from the full set. */
  commitExecutions: (execs: Execution[]) => Promise<number>;
  addCashFlow: (cf: CashFlow) => Promise<void>;
  removeCashFlow: (id: string) => Promise<void>;
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
  loading: false,
  load: async () => {
    set({ loading: true });
    const [trades, cashFlows] = await Promise.all([allTrades(), allCashFlows()]);
    set({ trades, cashFlows, loading: false });
  },
  commitExecutions: async (execs) => {
    const added = await addExecutions(execs);
    const trades = await rebuild();
    set({ trades });
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
  wipe: async () => {
    await wipeAll();
    set({ trades: [], cashFlows: [] });
  },
}));
