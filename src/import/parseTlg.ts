// IB TradeLog .tlg parser (CLAUDE.md §5.5.1). Pipe-delimited, 16 columns.
//
// Real layout (0-based), e.g.:
//   STK_TRD|1131742136|AAPL|APPLE INC|IEX|BUYTOOPEN|O|20260414|14:58:43|USD|54.00|1.00|257.97|13930.38|-1.00|0.8475
//   0 rectype 1 id 2 symbol 3 desc 4 exchange 5 action 6 code 7 date(YYYYMMDD)
//   8 time(HH:MM:SS) 9 ccy 10 shares(signed) 11 mult 12 price 13 proceeds 14 commission 15 fx
//
// Date and time are SEPARATE columns. Action is explicit in col 5 (BUYTOOPEN/SELLTOCLOSE/...).
// Reversals are left for reconstructTrades to split via position overshoot — emit one exec per fill.
import type { AssetType, Execution } from '@/domain/types';
import { toMinor } from '@/domain/money';

export interface ParseResult {
  executions: Execution[];
  warnings: string[];
}

const COL = {
  id: 1,
  symbol: 2,
  action: 5,
  code: 6,
  date: 7,
  time: 8,
  shares: 10,
  price: 12,
  comm: 14,
} as const;

// record-type prefixes that carry an asset class
function sectionAsset(recType: string): AssetType | null {
  const r = recType.toUpperCase();
  if (r.startsWith('STK')) return 'stock';
  if (r.startsWith('OPT')) return 'option';
  if (r.startsWith('FUT')) return 'future';
  if (r.startsWith('FX') || r.startsWith('CASH') || r.startsWith('FOREX')) return 'forex';
  return null;
}

function combineDateTime(date: string, time: string): string | null {
  const d = date.trim();
  const t = time.trim() || '00:00:00';
  const m = d.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) {
    const fallback = Date.parse(`${d} ${t}`);
    return Number.isNaN(fallback) ? null : new Date(fallback).toISOString();
  }
  const [, y, mo, day] = m;
  // .tlg has no timezone; treat as UTC for consistent storage.
  const iso = `${y}-${mo}-${day}T${t.length === 5 ? `${t}:00` : t}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function actionFromCols(actionCell: string, shares: number): Execution['action'] {
  const a = actionCell.toUpperCase();
  if (a.startsWith('BUY') || a.startsWith('BOT')) return 'buy';
  if (a.startsWith('SELL') || a.startsWith('SLD')) return 'sell';
  return shares >= 0 ? 'buy' : 'sell'; // fall back to sign
}

let tlgSeq = 0;

export function parseTlg(text: string, account = 'IB'): ParseResult {
  const warnings: string[] = [];
  const executions: Execution[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split('|');
    if (cells.length < 15) continue; // header sections / metadata / trailer

    const asset = sectionAsset(cells[0] ?? '');
    if (asset === null) continue; // not a known transaction row type

    const symbol = cells[COL.symbol]?.trim();
    const shares = Number(cells[COL.shares]);
    const price = Number(cells[COL.price]);
    const ts = combineDateTime(cells[COL.date] ?? '', cells[COL.time] ?? '');

    if (!symbol || !Number.isFinite(shares) || shares === 0 || !Number.isFinite(price) || ts === null) {
      warnings.push(`Skipped unparseable row for ${symbol || '?'}`);
      continue;
    }

    const baseId = cells[COL.id]?.trim() || `tlg-${tlgSeq}`;
    executions.push({
      id: `${baseId}-${tlgSeq++}`,
      symbol,
      assetType: asset,
      account,
      timestamp: ts,
      action: actionFromCols(cells[COL.action] ?? '', shares),
      quantity: Math.abs(shares),
      price: toMinor(price),
      commission: toMinor(Math.abs(Number(cells[COL.comm]) || 0)),
      fees: 0,
      raw: Object.fromEntries(cells.map((c, i) => [String(i), c])),
    });
  }

  if (executions.length === 0) {
    warnings.push('No trade rows found — is this an IB Third-Party TradeLog (.tlg)?');
  }
  return { executions, warnings };
}
