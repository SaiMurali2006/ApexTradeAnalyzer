// Timezone-aware date helpers. Trades store UTC ISO; day-bucketing happens in the
// user's exchange timezone (default Nasdaq = America/New_York), set in Settings.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Nasdaq / NYSE exchange timezone. */
export const DEFAULT_TZ = 'America/New_York';

/** YYYY-MM-DD for an instant, in the given timezone. */
export function dayKey(iso: string, tz: string = DEFAULT_TZ): string {
  return dayjs(iso).tz(tz).format('YYYY-MM-DD');
}

/** Day-of-week index (0 = Sunday) in the timezone. */
export function dowIndex(iso: string, tz: string = DEFAULT_TZ): number {
  return dayjs(iso).tz(tz).day();
}

/** Hour of day (0-23) in the timezone. */
export function hourOf(iso: string, tz: string = DEFAULT_TZ): number {
  return dayjs(iso).tz(tz).hour();
}
