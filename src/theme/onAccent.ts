// Luminance-based auto-contrast (CLAUDE.md §6.1). Never hardcode white on accent.

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/** Returns the readable text color to draw directly on `accent`. */
export function onAccent(accent: string): string {
  return luminance(accent) >= 150 ? '#10111a' : '#ffffff';
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const h = hex.trim().replace(/^#?/, '#');
  return h.toLowerCase();
}
