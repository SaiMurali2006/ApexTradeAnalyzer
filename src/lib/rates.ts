// Daily EUR/USD FX rate service. Fetches from Frankfurter (ECB daily rates, free,
// no key, CORS-enabled), caches each day's rate in IndexedDB (rates table) + a
// localStorage seed for instant offline startup. All rates are USD per 1 EUR.
import { allRates, getRate, putRate, type RateRow } from '@/store/db';

const SEED_KEY = 'apex.rate.last';
const FALLBACK_EUR_USD = 1.08; // used only if nothing cached and offline on first run

const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Last-known rate persisted to localStorage so the UI has a number on first paint. */
export function seedRate(): RateRow {
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (raw) {
      const r = JSON.parse(raw) as RateRow;
      if (r && typeof r.eurUsd === 'number' && r.eurUsd > 0) return r;
    }
  } catch {
    /* ignore */
  }
  return { date: 'fallback', eurUsd: FALLBACK_EUR_USD };
}

async function fetchFrankfurter(path: string): Promise<{ date: string; eurUsd: number } | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app${path}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { date: string; rates?: { USD?: number } };
    const usd = data.rates?.USD;
    if (typeof usd !== 'number' || !(usd > 0)) return null;
    return { date: data.date, eurUsd: usd };
  } catch {
    return null; // offline / blocked
  }
}

/** Latest daily rate: cached today's value, else fetch + cache, else last-known/fallback. */
export async function fetchLatestRate(): Promise<RateRow> {
  const today = todayUtc();
  const cached = await getRate(today);
  if (cached) return cached;

  const fetched = await fetchFrankfurter('/latest?from=EUR&to=USD');
  if (fetched) {
    const row: RateRow = { date: fetched.date, eurUsd: fetched.eurUsd };
    await putRate(row);
    // also store under today's key so we don't refetch repeatedly on weekends/holidays
    if (fetched.date !== today) await putRate({ date: today, eurUsd: fetched.eurUsd });
    localStorage.setItem(SEED_KEY, JSON.stringify(row));
    return row;
  }

  // offline: newest cached rate, else the localStorage seed / fallback
  const all = await allRates();
  if (all.length) return all[all.length - 1];
  return seedRate();
}

/** Rate for a specific date (for historical conversion); falls back to nearest cached. */
export async function fetchRateForDate(date: string): Promise<number> {
  const cached = await getRate(date);
  if (cached) return cached.eurUsd;
  const fetched = await fetchFrankfurter(`/${date}?from=EUR&to=USD`);
  if (fetched) {
    await putRate({ date, eurUsd: fetched.eurUsd });
    return fetched.eurUsd;
  }
  const all = await allRates();
  if (all.length) return all[all.length - 1].eurUsd;
  return seedRate().eurUsd;
}
