// Dashboard widget layout (CLAUDE.md §5.1 / §8b item 33). Ordered widgets with a
// column span `w` (1-4) and optional pixel height `h`, persisted locally. The widget
// registry itself lives in the Dashboard view.
import { create } from 'zustand';

const KEY = 'apex.dashboard';
export const GRID_COLS = 4;

export interface WidgetItem {
  id: string;
  w: number; // column span 1..GRID_COLS
  h?: number; // pixel height (only height-resizable widgets use it)
}

// default sizes per widget id (also used when adding a widget back)
export const DEFAULT_SIZE: Record<string, { w: number; h?: number }> = {
  netPnl: { w: 1 },
  winRate: { w: 1 },
  profitFactor: { w: 1 },
  expectancy: { w: 1 },
  maxDrawdown: { w: 1 },
  balance: { w: 1 },
  trades: { w: 1 },
  avgTrade: { w: 1 },
  sharpe: { w: 1 },
  equity: { w: 4, h: 300 },
  statgrid: { w: 4 },
  recent: { w: 2, h: 320 },
};

export const DEFAULT_LAYOUT: WidgetItem[] = [
  'netPnl', 'winRate', 'profitFactor', 'expectancy', 'maxDrawdown', 'balance', 'equity', 'statgrid', 'recent',
].map((id) => ({ id, ...DEFAULT_SIZE[id] }));

interface DashboardState {
  items: WidgetItem[];
  setItems: (items: WidgetItem[]) => void;
  toggle: (id: string) => void;
  setSize: (id: string, size: { w?: number; h?: number }) => void;
  reset: () => void;
}

function load(): WidgetItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        // migrate legacy string[] layout → sized items
        if (arr.every((x) => typeof x === 'string')) {
          return (arr as string[]).filter((id) => DEFAULT_SIZE[id]).map((id) => ({ id, ...DEFAULT_SIZE[id] }));
        }
        const items = (arr as WidgetItem[]).filter((x) => x && typeof x.id === 'string' && DEFAULT_SIZE[x.id]);
        if (items.length) return items.map((x) => ({ id: x.id, w: clampW(x.w), h: x.h }));
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LAYOUT;
}

const clampW = (w: number) => Math.max(1, Math.min(GRID_COLS, Math.round(w) || 1));

function persist(items: WidgetItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const useDashboard = create<DashboardState>((set, get) => ({
  items: load(),
  setItems: (items) => {
    set({ items });
    persist(items);
  },
  toggle: (id) => {
    const cur = get().items;
    const next = cur.some((w) => w.id === id)
      ? cur.filter((w) => w.id !== id)
      : [...cur, { id, ...DEFAULT_SIZE[id] }];
    set({ items: next });
    persist(next);
  },
  setSize: (id, size) => {
    const next = get().items.map((w) => (w.id === id ? { ...w, w: size.w != null ? clampW(size.w) : w.w, h: size.h != null ? size.h : w.h } : w));
    set({ items: next });
    persist(next);
  },
  reset: () => {
    set({ items: DEFAULT_LAYOUT });
    persist(DEFAULT_LAYOUT);
  },
}));
