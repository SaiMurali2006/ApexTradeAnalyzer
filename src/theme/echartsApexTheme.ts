// ECharts theme driven by live CSS tokens (CLAUDE.md §6.11).
// Read fresh on each build so charts follow mode/accent swaps.
import * as echarts from 'echarts';

function tok(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Resolve a CSS custom property to its computed color string (ECharts can't read var()). */
export function cssVar(name: string): string {
  return tok(name) || '#888';
}

export const APEX_THEME = 'apex';
let registered = false;

export function buildApexTheme() {
  const accent = tok('--accent');
  const accentAlt = tok('--accent-alt');
  const text = tok('--text');
  const muted = tok('--muted');
  const line = tok('--line-soft');
  const panel = tok('--panel');
  const lineDef = tok('--line');

  return {
    color: [accent, accentAlt, tok('--profit'), tok('--danger'), muted],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: tok('--font-sans'), color: text, fontWeight: 700 },
    title: { textStyle: { color: text } },
    grid: { borderColor: line, top: 24, right: 18, bottom: 28, left: 56 },
    categoryAxis: axis(muted, line),
    valueAxis: axis(muted, line),
    legend: { textStyle: { color: muted } },
    tooltip: {
      backgroundColor: panel,
      borderColor: lineDef,
      borderWidth: 1,
      borderRadius: 14,
      textStyle: { color: text, fontFamily: tok('--font-mono') },
      extraCssText: 'box-shadow:0 18px 40px rgba(0,0,0,.35);',
    },
  };
}

function axis(muted: string, line: string) {
  return {
    axisLine: { lineStyle: { color: line } },
    axisTick: { show: false },
    axisLabel: { color: muted, fontFamily: 'var(--font-mono)' },
    splitLine: { lineStyle: { color: line, type: 'dashed' } },
  };
}

/** (Re)register the theme from current tokens. Call on mount + on theme change. */
export function refreshApexTheme() {
  echarts.registerTheme(APEX_THEME, buildApexTheme());
  registered = true;
}

export function ensureApexTheme() {
  if (!registered) refreshApexTheme();
}
