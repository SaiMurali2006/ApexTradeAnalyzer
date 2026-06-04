// Cash-flow aggregation + account-balance curve (CLAUDE.md §8b).
// Balance = startingBalance + Σ(deposits − withdrawals) + Σ(realized net PnL), over time.
import type { CashFlow, Trade } from '@/domain/types';
import { DEFAULT_TZ } from '@/lib/dates';
import { equityCurve } from './series';

export interface FlowDay {
  date: string; // YYYY-MM-DD (exchange tz)
  deposit: number; // minor units
  withdrawal: number; // minor units (positive magnitude)
  net: number; // deposit - withdrawal
  flows: CashFlow[];
}

export type FlowMap = Map<string, FlowDay>;

// Cash flows are calendar-dated (not exchange instants), so bucket by their literal day.
export function flowByDay(cashFlows: CashFlow[]): FlowMap {
  const m: FlowMap = new Map();
  for (const cf of cashFlows) {
    const d = cf.date.slice(0, 10);
    const day = m.get(d) ?? { date: d, deposit: 0, withdrawal: 0, net: 0, flows: [] };
    if (cf.type === 'deposit') day.deposit += cf.amount;
    else day.withdrawal += cf.amount;
    day.net = day.deposit - day.withdrawal;
    day.flows.push(cf);
    m.set(d, day);
  }
  return m;
}

/** Net deposits (deposits − withdrawals), minor units. */
export function netDeposits(cashFlows: CashFlow[]): number {
  return cashFlows.reduce((s, cf) => s + (cf.type === 'deposit' ? cf.amount : -cf.amount), 0);
}

export interface BalancePoint {
  date: string;
  balance: number; // minor units
  pnl: number; // realized net PnL that day
  net: number; // net cash flow that day
}

/** Daily account-balance curve seeding from startingBalance (minor units). */
export function balanceCurve(
  trades: Trade[],
  cashFlows: CashFlow[],
  startingBalance: number,
  tz: string = DEFAULT_TZ,
): BalancePoint[] {
  const pnlByDay = new Map(equityCurve(trades, tz).map((p) => [p.date, p.pnl]));
  const flows = flowByDay(cashFlows);
  const dates = [...new Set([...pnlByDay.keys(), ...flows.keys()])].sort();

  let bal = startingBalance;
  return dates.map((date) => {
    const pnl = pnlByDay.get(date) ?? 0;
    const net = flows.get(date)?.net ?? 0;
    bal += pnl + net;
    return { date, balance: bal, pnl, net };
  });
}
