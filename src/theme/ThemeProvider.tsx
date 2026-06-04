import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isValidHex, normalizeHex, onAccent } from './onAccent';

export type Mode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: Mode;
  accent: string;
  setMode: (m: Mode) => void;
  setAccent: (hex: string) => void;
}

const STORAGE_KEY = 'apex.theme';
const DEFAULT_ACCENT = '#7c73ff';

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'violet', hex: '#7c73ff' },
  { name: 'azure', hex: '#3b82f6' },
  { name: 'teal', hex: '#14b8a6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'amber', hex: '#f59e0b' },
  { name: 'coral', hex: '#fb7185' },
  { name: 'magenta', hex: '#d946ef' },
  { name: 'neutral', hex: '#8b8fa3' },
];

const ThemeCtx = createContext<ThemeState | null>(null);

function load(): { mode: Mode; accent: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { mode?: Mode; accent?: string };
      return {
        mode: p.mode ?? 'system',
        accent: p.accent && isValidHex(p.accent) ? normalizeHex(p.accent) : DEFAULT_ACCENT,
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { mode: 'system', accent: DEFAULT_ACCENT };
}

function resolveMode(mode: Mode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function apply(mode: Mode, accent: string): void {
  const root = document.documentElement;
  root.dataset.mode = resolveMode(mode);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--on-accent', onAccent(accent));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ mode, accent }, setState] = useState(load);

  useEffect(() => {
    apply(mode, accent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accent }));
  }, [mode, accent]);

  // follow OS theme in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system', accent);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode, accent]);

  const value: ThemeState = {
    mode,
    accent,
    setMode: (m) => setState((s) => ({ ...s, mode: m })),
    setAccent: (hex) => isValidHex(hex) && setState((s) => ({ ...s, accent: normalizeHex(hex) })),
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
