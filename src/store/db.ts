// IndexedDB persistence via Dexie (CLAUDE.md §2). On-device only.
import Dexie, { type Table } from 'dexie';
import type { Execution, Trade } from '@/domain/types';

export interface StoredExecution extends Execution {
  hash: string; // dedupe key on re-import
}

class ApexDB extends Dexie {
  executions!: Table<StoredExecution, string>;
  trades!: Table<Trade, string>;

  constructor() {
    super('apex-trade-analyzer');
    this.version(1).stores({
      executions: 'hash, symbol, account, assetType, timestamp',
      trades: 'id, symbol, account, assetType, openDate, closeDate',
    });
  }
}

export const db = new ApexDB();

/** Stable dedupe hash for an execution (broker id + symbol + ts + qty + price). */
export function execHash(e: Execution): string {
  return `${e.account}|${e.symbol}|${e.timestamp}|${e.action}|${e.quantity}|${e.price}|${e.id}`;
}

/** Insert new executions (dedup by hash) and return how many were added. */
export async function addExecutions(execs: Execution[]): Promise<number> {
  const stored: StoredExecution[] = execs.map((e) => ({ ...e, hash: execHash(e) }));
  const before = await db.executions.count();
  await db.executions.bulkPut(stored);
  const after = await db.executions.count();
  return after - before;
}

export async function allExecutions(): Promise<Execution[]> {
  return db.executions.toArray();
}

/** Replace the trades table with a freshly reconstructed set. */
export async function replaceTrades(trades: Trade[]): Promise<void> {
  await db.transaction('rw', db.trades, async () => {
    await db.trades.clear();
    await db.trades.bulkPut(trades);
  });
}

export async function allTrades(): Promise<Trade[]> {
  return db.trades.orderBy('openDate').toArray();
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.executions, db.trades, async () => {
    await db.executions.clear();
    await db.trades.clear();
  });
}
