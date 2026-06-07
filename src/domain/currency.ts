// Currency conversion (EUR↔USD) for the display layer. Records store native minor
// units + a `currency` tag; views convert everything to the chosen display currency
// using the daily rate so mixed-broker data (USD .tlg + EUR Trade Republic) aggregates
// correctly. Undefined currency is treated as USD (legacy rows).
import type { CashFlow, Currency, Position, Trade } from './types';

const ccy = (c?: Currency): Currency => c ?? 'USD';

/** Convert integer minor units between currencies. `eurUsd` = USD per 1 EUR. */
export function convertMinor(minor: number, from: Currency | undefined, to: Currency, eurUsd: number): number {
  const f = ccy(from);
  if (f === to || !(eurUsd > 0)) return minor;
  const usd = f === 'USD' ? minor : minor * eurUsd; // → USD
  const out = to === 'USD' ? usd : usd / eurUsd; // USD → target
  return Math.round(out);
}

/** Convert a trade's monetary fields (and its executions) to `to`. No-op when already in `to`. */
export function convertTrade(t: Trade, to: Currency, eurUsd: number): Trade {
  if (ccy(t.currency) === to) return t;
  const c = (v: number) => convertMinor(v, t.currency, to, eurUsd);
  return {
    ...t,
    avgEntry: c(t.avgEntry),
    avgExit: t.avgExit === null ? null : c(t.avgExit),
    grossPnl: c(t.grossPnl),
    netPnl: c(t.netPnl),
    commission: c(t.commission),
    fees: c(t.fees),
    // convert executions too so the trade-detail drawer stays consistent
    executions: t.executions.map((e) => ({
      ...e,
      price: convertMinor(e.price, e.currency, to, eurUsd),
      commission: convertMinor(e.commission, e.currency, to, eurUsd),
      fees: convertMinor(e.fees, e.currency, to, eurUsd),
      currency: to,
    })),
    currency: to,
  };
}

export function convertTrades(trades: Trade[], to: Currency, eurUsd: number): Trade[] {
  if (trades.every((t) => ccy(t.currency) === to)) return trades;
  return trades.map((t) => convertTrade(t, to, eurUsd));
}

/** Convert open-position cost basis to `to`. qty/multiplier are currency-agnostic. */
export function convertPositions(positions: Position[], to: Currency, eurUsd: number): Position[] {
  if (positions.every((p) => ccy(p.currency) === to)) return positions;
  return positions.map((p) => ({ ...p, avgEntry: convertMinor(p.avgEntry, p.currency, to, eurUsd), currency: to }));
}

// Each cash flow may lock its own rate (`eurUsd`) captured at entry time; fall back to
// the live rate when none is stored.
export function convertCashFlows(flows: CashFlow[], to: Currency, eurUsd: number): CashFlow[] {
  if (flows.every((f) => ccy(f.currency) === to)) return flows;
  return flows.map((f) => ({
    ...f,
    amount: convertMinor(f.amount, f.currency, to, f.eurUsd && f.eurUsd > 0 ? f.eurUsd : eurUsd),
    currency: to,
  }));
}
