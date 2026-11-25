/**
 * Progress of a slow step in a timeline: when to show it, how full the bar is and what to say about
 * the time left. No imports: pure functions with unit tests.
 */

/** A step that takes longer than this gets a progress bar: about where people start to wonder. */
export const SHOW_AFTER__s = 3;

/** The bar never fills up before the step is done; past the expected time it creeps towards this. */
const MAX_FRACTION = 0.95;
/** Share of the bar at the expected time: the rest is room for steps that take longer than usual. */
const AT_EXPECTED = 0.85;

/** Whether a step that has run for `elapsed` seconds shows a progress bar. */
export function showProgress(elapsed__s: number): boolean {
  return elapsed__s >= SHOW_AFTER__s;
}

/**
 * How full the bar is (0..MAX_FRACTION). Linear up to AT_EXPECTED at the expected time, then slowly
 * towards MAX_FRACTION, so the bar keeps moving but never claims the step is done.
 */
export function progressFraction(elapsed__s: number, expected__s: number): number {
  if (!(expected__s > 0) || !(elapsed__s > 0)) return 0;
  const x = elapsed__s / expected__s;
  if (x <= 1) return AT_EXPECTED * x;
  return MAX_FRACTION - (MAX_FRACTION - AT_EXPECTED) * Math.exp(-(x - 1));
}

export type TimeLeft = { kind: "seconds"; value: number } | { kind: "almost" } | { kind: "longer" };

/** What to say about the time left: whole seconds, 'almost done', or 'takes longer than usual'. */
export function timeLeft(elapsed__s: number, expected__s: number): TimeLeft {
  const left = expected__s - elapsed__s;
  if (left >= 1.5) return { kind: "seconds", value: Math.round(left) };
  if (elapsed__s <= expected__s * 1.5) return { kind: "almost" };
  return { kind: "longer" };
}

/** The new expected duration after a step took `actual` seconds: a moving average, so one outlier does not dominate. */
export function updateExpected(previous__s: number | undefined, actual__s: number): number {
  if (!(actual__s > 0)) return previous__s ?? 0;
  if (previous__s === undefined || !(previous__s > 0)) return actual__s;
  return 0.6 * previous__s + 0.4 * actual__s;
}
