// PnL calendar helpers (CLAUDE.md §5.2). Buckets closed trades by realized day.
import type { Trade } from '@/domain/types';
import { dayKey, DEFAULT_TZ } from '@/lib/dates';

export interface DayCell {
  date: string; // YYYY-MM-DD
  pnl: number; // net, minor units
  count: number;
  trades: Trade[];
}

export type DayMap = Map<string, DayCell>;

export function dayMap(trades: Trade[], tz: string = DEFAULT_TZ): DayMap {
  const m: DayMap = new Map();
  for (const t of trades) {
    if (t.isOpen) continue;
    const d = dayKey(t.closeDate ?? t.openDate, tz);
    const cell = m.get(d) ?? { date: d, pnl: 0, count: 0, trades: [] };
    cell.pnl += t.netPnl;
    cell.count += 1;
    cell.trades.push(t);
    m.set(d, cell);
  }
  return m;
}

export interface MonthGrid {
  year: number;
  month: number; // 0-11
  weeks: (DayCell | null)[][]; // rows of 7 (Sun..Sat), null = padding
  weekPnls: number[]; // per displayed week
  monthPnl: number;
  tradingDays: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Build a Sun-first month grid for (year, month) from a day map. */
export function monthGrid(map: DayMap, year: number, month: number): MonthGrid {
  const first = new Date(Date.UTC(year, month, 1));
  const startDow = first.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = ymd(year, month, d);
    cells.push(map.get(key) ?? { date: key, pnl: 0, count: 0, trades: [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const weekPnls = weeks.map((w) => w.reduce((s, c) => s + (c?.count ? c.pnl : 0), 0));
  const monthPnl = cells.reduce((s, c) => s + (c?.pnl ?? 0), 0);
  const tradingDays = cells.filter((c) => c?.count).length;

  return { year, month, weeks, weekPnls, monthPnl, tradingDays };
}

/** Heatmap data for an ECharts calendar series: [date, pnlMajor][]. */
export function heatmapData(map: DayMap): [string, number][] {
  return [...map.values()].map((c) => [c.date, c.pnl]);
}
