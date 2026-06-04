// Global data store (CLAUDE.md §2/§7). Holds reconstructed trades; reloads from IndexedDB.
import { create } from 'zustand';
import type { Execution, Trade } from '@/domain/types';
import { reconstructTrades } from '@/domain/reconstructTrades';
import { addExecutions, allExecutions, allTrades, replaceTrades, wipeAll } from './db';

interface DataState {
  trades: Trade[];
  loading: boolean;
  load: () => Promise<void>;
  /** Commit freshly parsed executions: dedupe-store, rebuild trades from the full set. */
  commitExecutions: (execs: Execution[]) => Promise<number>;
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
  loading: false,
  load: async () => {
    set({ loading: true });
    const trades = await allTrades();
    set({ trades, loading: false });
  },
  commitExecutions: async (execs) => {
    const added = await addExecutions(execs);
    const trades = await rebuild();
    set({ trades });
    return added;
  },
  wipe: async () => {
    await wipeAll();
    set({ trades: [] });
  },
}));
