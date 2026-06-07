// User settings (CLAUDE.md §5.6). Persisted to localStorage; on-device only.
import { create } from 'zustand';

export interface Settings {
  currency: string; // ISO 4217
  timezone: string; // IANA tz or 'UTC'
  startingBalance: number; // major units, for %-return / equity baseline
  futuresOverrides: Record<string, number>; // root symbol -> point value
  includeCommission: boolean; // subtract broker commission from PnL
  includeFees: boolean; // subtract exchange/reg fees from PnL
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  setFuture: (root: string, value: number) => void;
  removeFuture: (root: string) => void;
}

const KEY = 'apex.settings';

const DEFAULTS: Settings = {
  currency: 'USD',
  timezone: 'America/New_York', // Nasdaq / NYSE exchange time
  startingBalance: 0,
  futuresOverrides: {},
  includeCommission: true,
  includeFees: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

function persist(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch);
    persist({ ...get(), ...patch });
  },
  setFuture: (root, value) => {
    const futuresOverrides = { ...get().futuresOverrides, [root.toUpperCase()]: value };
    set({ futuresOverrides });
    persist({ ...get(), futuresOverrides });
  },
  removeFuture: (root) => {
    const futuresOverrides = { ...get().futuresOverrides };
    delete futuresOverrides[root.toUpperCase()];
    set({ futuresOverrides });
    persist({ ...get(), futuresOverrides });
  },
}));

/** Common IANA timezones for the picker. */
export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Australia/Sydney',
];

// Only USD/EUR are supported for live conversion (the daily EUR/USD rate).
export const CURRENCIES = ['USD', 'EUR'];
