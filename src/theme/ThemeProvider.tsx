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

function lighten(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const mix = (c: number) => Math.round(c + (255 - c) * pct);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Build the favicon from the active accent so the tab icon matches the theme. */
function applyFavicon(accent: string): void {
  const fg = onAccent(accent);
  const ring = lighten(accent, 0.25);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect x="2" y="2" width="28" height="28" rx="8" fill="${accent}"/>` +
    `<rect x="2.6" y="2.6" width="26.8" height="26.8" rx="7.4" fill="none" stroke="${ring}" stroke-width="1.2"/>` +
    `<path d="M16 8.5l6.5 15h-3.2l-1.25-3.1h-4.1L12.7 23.5H9.5L16 8.5zm0 5.6l-1.2 3h2.4l-1.2-3z" fill="${fg}"/>` +
    `</svg>`;
  const link = document.getElementById('favicon') as HTMLLinkElement | null;
  if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function apply(mode: Mode, accent: string): void {
  const root = document.documentElement;
  root.dataset.mode = resolveMode(mode);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--on-accent', onAccent(accent));
  applyFavicon(accent);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ mode, accent }, setState] = useState(load);

  // apply on first mount + persist on change
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
    // Apply to :root synchronously in the handler so the new CSS vars are live
    // BEFORE children re-render — otherwise canvas charts (which read tokens in
    // their own effects, run child-first) would re-register with the old palette.
    setMode: (m) => {
      apply(m, accent);
      setState((s) => ({ ...s, mode: m }));
    },
    setAccent: (hex) => {
      if (!isValidHex(hex)) return;
      const next = normalizeHex(hex);
      apply(mode, next);
      setState((s) => ({ ...s, accent: next }));
    },
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
