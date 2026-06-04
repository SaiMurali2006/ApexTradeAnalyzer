// Generic broker CSV parser (CLAUDE.md §5.5.2). PapaParse + header auto-map.
import Papa from 'papaparse';
import type { AssetType, Execution } from '@/domain/types';
import { toMinor } from '@/domain/money';
import type { ParseResult } from './parseTlg';

export type Field = 'symbol' | 'timestamp' | 'action' | 'quantity' | 'price' | 'commission' | 'fees' | 'assetType';

export type ColumnMap = Partial<Record<Field, string>>;

// Header aliases for auto-detection (lowercased, non-alphanumerics stripped).
const ALIASES: Record<Field, string[]> = {
  symbol: ['symbol', 'ticker', 'instrument', 'underlying', 'contract'],
  timestamp: ['timestamp', 'datetime', 'date', 'time', 'tradedate', 'executiontime', 'transactiondate'],
  action: ['action', 'side', 'buysell', 'type', 'direction'],
  quantity: ['quantity', 'qty', 'shares', 'amount', 'volume', 'size', 'filledqty'],
  price: ['price', 'fillprice', 'executionprice', 'avgprice', 'tradeprice'],
  commission: ['commission', 'comm', 'commissions'],
  fees: ['fees', 'fee', 'reg fee', 'secfee'],
  assetType: ['assettype', 'asset', 'securitytype', 'class'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const field of Object.keys(ALIASES) as Field[]) {
    const aliases = ALIASES[field].map(norm);
    const hit = normed.find((h) => aliases.includes(h.n)) ?? normed.find((h) => aliases.some((a) => h.n.includes(a)));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

function parseAction(v: string): Execution['action'] | null {
  const s = v.toLowerCase().trim();
  if (/^(b|buy|bot|bought|long|buytoopen|bto|buytoclose|btc)/.test(s)) return 'buy';
  if (/^(s|sell|sld|sold|short|selltoopen|sto|selltoclose|stc)/.test(s)) return 'sell';
  return null;
}

function parseAsset(v: string | undefined): AssetType {
  const s = (v ?? '').toLowerCase();
  if (s.includes('opt')) return 'option';
  if (s.includes('fut')) return 'future';
  if (s.includes('forex') || s.includes('fx') || s.includes('cash')) return 'forex';
  if (s.includes('crypto')) return 'crypto';
  if (s.includes('ind')) return 'index';
  return 'stock';
}

let csvSeq = 0;

export function parseCsv(text: string, map: ColumnMap, account = 'CSV'): ParseResult {
  const warnings: string[] = [];
  const executions: Execution[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) warnings.push(`${parsed.errors.length} CSV parse error(s); rows may be skipped`);

  const get = (row: Record<string, string>, f: Field) => (map[f] ? row[map[f]!] : undefined);

  for (const row of parsed.data) {
    const symbol = get(row, 'symbol')?.trim();
    const action = parseAction(get(row, 'action') ?? '');
    const qty = Math.abs(Number(get(row, 'quantity')));
    const price = Number(get(row, 'price'));
    const ts = get(row, 'timestamp');
    const t = ts ? Date.parse(ts) : NaN;

    if (!symbol || !action || !Number.isFinite(qty) || qty === 0 || !Number.isFinite(price) || Number.isNaN(t)) {
      warnings.push(`Skipped row (missing/invalid required field): ${symbol ?? '?'}`);
      continue;
    }

    executions.push({
      id: `csv-${csvSeq++}`,
      symbol,
      assetType: parseAsset(get(row, 'assetType')),
      account,
      timestamp: new Date(t).toISOString(),
      action,
      quantity: qty,
      price: toMinor(price),
      commission: toMinor(Math.abs(Number(get(row, 'commission')) || 0)),
      fees: toMinor(Math.abs(Number(get(row, 'fees')) || 0)),
      raw: row,
    });
  }

  if (executions.length === 0) warnings.push('No valid rows parsed — check the column mapping.');
  return { executions, warnings };
}

export function csvHeaders(text: string): string[] {
  const r = Papa.parse<string[]>(text, { preview: 1 });
  return (r.data[0] as string[] | undefined) ?? [];
}
