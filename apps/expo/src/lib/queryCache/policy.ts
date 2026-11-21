/**
 * Which server data the app keeps on the phone between starts, and for how long ("stale-while-revalidate": show
 * the last known data at once, fetch new data in the background and say so on screen).
 *
 * Kept: the account with its campaign and data sources, the devices, the energy queries and the cloud feeds; that is
 * what the home screen needs. Not kept: API keys (such as the EP-online key, which must not be stored), Wi-Fi
 * networks, and measurements (large, and fetched per screen anyway).
 *
 * This file has no imports, so it also runs directly under Node.
 */

export const QUERY_CACHE_VERSION = 1;
/** Older than this, a saved cache is not shown at all (the screen then waits for the server). */
export const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Data older than this is refreshed when a screen shows it or the app comes back to the foreground. */
export const STALE_TIME_MS = 60 * 1000;

const PERSISTED_KEYS = ["user", "devices", "energy_queries", "cloud-feeds"];

export function shouldPersistQuery(queryKey: readonly unknown[], status: string): boolean {
  return status === "success" && typeof queryKey[0] === "string" && PERSISTED_KEYS.includes(queryKey[0]);
}

export type SavedQueryCache = { version: number; savedAt: number; state: unknown };

/** A saved cache that may be restored: same format version and not too old. */
export function isUsableQueryCache(saved: unknown, now: number): saved is SavedQueryCache {
  const s = saved as Partial<SavedQueryCache> | null;
  return (
    !!s &&
    s.version === QUERY_CACHE_VERSION &&
    typeof s.savedAt === "number" &&
    now - s.savedAt >= 0 &&
    now - s.savedAt <= QUERY_CACHE_MAX_AGE_MS &&
    s.state !== undefined
  );
}

/** "14:32" today, "di 14:32" this week, else "12-11 14:32" (local time). */
export function formatUpdatedAt(updatedAt: number, now: number, weekdays: string[]): string {
  const d = new Date(updatedAt);
  const n = new Date(now);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === n.toDateString()) return time;
  if (now - updatedAt < 6 * 24 * 60 * 60 * 1000) return `${weekdays[d.getDay()]} ${time}`;
  return `${d.getDate()}-${d.getMonth() + 1} ${time}`;
}
