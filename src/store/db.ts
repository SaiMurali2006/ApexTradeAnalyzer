// IndexedDB persistence via Dexie (CLAUDE.md §2). On-device only.
import Dexie, { type Table } from 'dexie';
import type { CashFlow, Execution, Trade } from '@/domain/types';

export interface StoredExecution extends Execution {
  hash: string; // dedupe key on re-import
}

class ApexDB extends Dexie {
  executions!: Table<StoredExecution, string>;
  trades!: Table<Trade, string>;
  cashFlows!: Table<CashFlow, string>;

  constructor() {
    super('apex-trade-analyzer');
    this.version(1).stores({
      executions: 'hash, symbol, account, assetType, timestamp',
      trades: 'id, symbol, account, assetType, openDate, closeDate',
    });
    this.version(2).stores({
      cashFlows: 'id, date, type, account',
    });
  }
}

export const db = new ApexDB();

/**
 * Stable dedupe hash for an execution. Content-based so re-importing the same file
 * collapses to the same key (the volatile `id` carries a per-import counter and must
 * NOT be used). When the broker supplies a stable execution id, it disambiguates
 * genuinely-identical fills.
 */
export function execHash(e: Execution): string {
  const core = `${e.account}|${e.symbol}|${e.timestamp}|${e.action}|${e.quantity}|${e.price}|${e.commission}|${e.fees}`;
  return e.brokerId ? `${core}|${e.brokerId}` : core;
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

export async function allCashFlows(): Promise<CashFlow[]> {
  return db.cashFlows.orderBy('date').toArray();
}

export async function putCashFlow(cf: CashFlow): Promise<void> {
  await db.cashFlows.put(cf);
}

export async function deleteCashFlow(id: string): Promise<void> {
  await db.cashFlows.delete(id);
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.executions, db.trades, db.cashFlows, async () => {
    await db.executions.clear();
    await db.trades.clear();
    await db.cashFlows.clear();
  });
}
