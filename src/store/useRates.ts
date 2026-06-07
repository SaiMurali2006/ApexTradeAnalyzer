// Live daily EUR/USD rate (USD per 1 EUR), with an optional manual override.
// `eurUsd` is what views consume = manual override if set, else the fetched daily rate.
// Seeded from localStorage for instant paint; refreshed from the network on app load.
import { create } from 'zustand';
import { fetchLatestRate, seedRate } from '@/lib/rates';

const MANUAL_KEY = 'apex.rate.manual';

function loadManual(): number | null {
  const raw = localStorage.getItem(MANUAL_KEY);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface RatesState {
  fetched: number; // latest fetched/cached daily rate
  date: string; // YYYY-MM-DD of the fetched rate, or 'fallback'
  manual: number | null; // user override (USD per 1 EUR)
  eurUsd: number; // effective rate = manual ?? fetched
  loading: boolean;
  ensure: () => Promise<void>;
  refresh: () => Promise<void>; // re-fetch and clear the manual override
  setManual: (v: number | null) => void;
}

const seed = seedRate();
const initialManual = loadManual();

export const useRates = create<RatesState>((set, get) => ({
  fetched: seed.eurUsd,
  date: seed.date,
  manual: initialManual,
  eurUsd: initialManual ?? seed.eurUsd,
  loading: false,
  ensure: async () => {
    set({ loading: true });
    const r = await fetchLatestRate();
    set({ fetched: r.eurUsd, date: r.date, eurUsd: get().manual ?? r.eurUsd, loading: false });
  },
  refresh: async () => {
    set({ loading: true });
    const r = await fetchLatestRate();
    localStorage.removeItem(MANUAL_KEY);
    set({ fetched: r.eurUsd, date: r.date, manual: null, eurUsd: r.eurUsd, loading: false });
  },
  setManual: (v) => {
    if (v != null && v > 0) {
      localStorage.setItem(MANUAL_KEY, String(v));
      set({ manual: v, eurUsd: v });
    } else {
      localStorage.removeItem(MANUAL_KEY);
      set({ manual: null, eurUsd: get().fetched });
    }
  },
}));
