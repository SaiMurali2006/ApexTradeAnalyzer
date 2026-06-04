// Integer minor-unit money (CLAUDE.md §2). All PnL math stays in integers;
// formatting happens only at the view boundary.

/** Parse a decimal string/number of major units into integer minor units (cents). */
export function toMinor(major: number | string, decimals = 2): number {
  const n = typeof major === 'string' ? Number(major.replace(/[, ]/g, '')) : major;
  if (!Number.isFinite(n)) return 0;
  // Round through a scaled integer to dodge float drift (e.g. 19.99 * 100).
  return Math.round(n * 10 ** decimals);
}

/** Minor units -> major-unit number (for display/math that needs it). */
export function toMajor(minor: number, decimals = 2): number {
  return minor / 10 ** decimals;
}

export interface MoneyFormatOpts {
  currency?: string;
  decimals?: number;
  signed?: boolean; // force leading + on positives
}

// Display currency default, set from user settings. Math is currency-agnostic;
// this only affects the symbol/grouping shown.
let displayCurrency = 'USD';
export function setDisplayCurrency(code: string): void {
  displayCurrency = code;
}

/** Format integer minor units as a currency string. */
export function formatMoney(minor: number, opts: MoneyFormatOpts = {}): string {
  const { currency = displayCurrency, decimals = 2, signed = false } = opts;
  const major = toMajor(minor, decimals);
  const sign = major > 0 && signed ? '+' : '';
  return (
    sign +
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major)
  );
}

export function formatPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}
