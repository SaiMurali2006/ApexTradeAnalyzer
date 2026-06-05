// Trade Republic CSV parser (CLAUDE.md §8b). Emits Execution[] for the shared
// reconstruct→preview→persist pipeline — does NOT touch the .tlg path.
//
// TR transactions export (header row), columns we use:
//   datetime · date · category · type · asset_class · name · symbol(ISIN)
//   shares(signed) · price(per-share EUR) · amount · fee · tax · currency · transaction_id
//
// Notes:
// - symbol = ISIN (stable round-trip grouping key); name is non-unique so unsuitable.
// - TR derivatives (warrants/Optionsscheine) are priced 1:1 — amount == shares*price — so
//   they must NOT map to `option` (which carries a ×100 multiplier). Map them to a ×1
//   asset class to keep PnL exact. Crypto → crypto (also ×1); stocks/funds → stock.
import Papa from 'papaparse';
import type { AssetType, Execution } from '@/domain/types';
import { toMinor } from '@/domain/money';
import type { ParseResult } from './parseTlg';

const ASSET_CLASS: Record<string, AssetType> = {
  STOCK: 'stock',
  FUND: 'stock',
  DERIVATIVE: 'stock', // 1:1 priced warrant — keep ×1 multiplier
  CRYPTO: 'crypto',
};

let seq = 0;

export function parseTradeRepublic(text: string, account = 'Trade Republic'): ParseResult {
  const warnings: string[] = [];
  const executions: Execution[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) warnings.push(`${parsed.errors.length} CSV parse error(s); some rows may be skipped`);

  let skipped = 0;
  for (const row of parsed.data) {
    const category = (row.category ?? '').toUpperCase();
    const type = (row.type ?? '').toUpperCase();

    // only completed buy/sell trades become executions
    if (category !== 'TRADING' || (type !== 'BUY' && type !== 'SELL')) {
      skipped += 1;
      continue;
    }

    const isin = (row.symbol ?? '').trim();
    const shares = Number(row.shares);
    const price = Number(row.price);
    const ts = row.datetime || row.date;
    const t = ts ? Date.parse(ts) : NaN;

    if (!isin || !Number.isFinite(shares) || shares === 0 || !Number.isFinite(price) || Number.isNaN(t)) {
      warnings.push(`Skipped row (missing/invalid field): ${isin || row.name || '?'}`);
      continue;
    }

    executions.push({
      id: `${row.transaction_id || `tr-${seq}`}-${seq++}`,
      brokerId: row.transaction_id || undefined,
      symbol: isin,
      assetType: ASSET_CLASS[(row.asset_class ?? '').toUpperCase()] ?? 'stock',
      account,
      timestamp: new Date(t).toISOString(),
      action: type === 'BUY' ? 'buy' : 'sell',
      quantity: Math.abs(shares),
      price: toMinor(price),
      commission: toMinor(Math.abs(Number(row.fee) || 0)),
      fees: toMinor(Math.abs(Number(row.tax) || 0)),
      raw: row,
    });
  }

  if (skipped) warnings.push(`${skipped} non-trade row(s) skipped (deposits, cancellations, dividends, etc.)`);
  if (executions.length === 0) warnings.push('No Trade Republic trades found — is this a TR transactions CSV export?');
  return { executions, warnings };
}
