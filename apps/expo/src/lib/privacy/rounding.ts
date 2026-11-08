/**
 * Rounding rules per property, applied in the app before an energy query result is uploaded.
 *
 * A campaign sets the rules on its energy query type (server field `rounding`, JSON). A rule is
 * either a step (rounded to a multiple of `step` after clamping to [`min`, `max`], so each tail
 * ends up in one value) or bins (the first bin whose exclusive upper bound `lt` the value is
 * below, uploaded as that bin's representative `value`; the last bin is open). Results computed
 * from public data, such as a heat performance signature, are quasi-identifiers: choose rules
 * beforehand with AnonyMate's rounding analysis against a norm (e.g. p = 0.09, k >= 11).
 *
 * This file has no imports, so it also runs directly under Node.
 */

export type RoundingRule =
  | { step: number; min?: number; max?: number }
  | { bins: { lt?: number; value: number }[] };
export type RoundingRules = Record<string, RoundingRule>;

/**
 * Default for the heat performance signature when a campaign sets nothing: deciles for H and
 * quintiles for C, Asol and Ainf, with the median of each bin as its value. Computed from the
 * national population of single-family homes (AnonyMate, method `passend`, 5.28 million homes).
 * Against k >= 11 (p = 0.09), publishing these four together leaves 0.02% of the homes in a group
 * smaller than 11 nationally, and 0.66% within an H3 level-4 zone (an attacker who roughly knows
 * the region). Steps such as H 10 W/K, C 500 Wh/K left 25% and 72%.
 */
export const DEFAULT_SIGNATURE_ROUNDING: RoundingRules = {
  heat_tr_building_cond__W_K_1: {
    bins: [
      { lt: 100, value: 80 },
      { lt: 140, value: 120 },
      { lt: 170, value: 155 },
      { lt: 200, value: 185 },
      { lt: 235, value: 220 },
      { lt: 270, value: 250 },
      { lt: 315, value: 290 },
      { lt: 385, value: 345 },
      { lt: 510, value: 435 },
      { value: 650 },
    ],
  },
  th_mass_building__Wh_K_1: {
    bins: [
      { lt: 8700, value: 6200 },
      { lt: 11100, value: 10000 },
      { lt: 13400, value: 12100 },
      { lt: 17400, value: 15000 },
      { value: 21500 },
    ],
  },
  aperture_sol__m2: {
    bins: [
      { lt: 7.5, value: 6.5 },
      { lt: 10.5, value: 9.0 },
      { lt: 13.0, value: 11.5 },
      { lt: 17.0, value: 14.5 },
      { value: 21.0 },
    ],
  },
  aperture_inf__cm2: {
    bins: [
      { lt: 60, value: 40 },
      { lt: 90, value: 75 },
      { lt: 115, value: 100 },
      { lt: 155, value: 130 },
      { value: 205 },
    ],
  },
};

/** Parse the `rounding` JSON of an energy query type; invalid or empty -> {} (defaults apply). */
export function parseRoundingRules(text: string | null | undefined): RoundingRules {
  if (!text) return {};
  try {
    const parsed: Record<string, unknown> = JSON.parse(text) ?? {};
    const out: RoundingRules = {};
    for (const name of Object.keys(parsed)) {
      const rule = parsed[name];
      if (isValidRule(rule)) out[name] = rule;
    }
    return out;
  } catch {
    return {};
  }
}

function isValidRule(rule: any): rule is RoundingRule {
  if (rule && typeof rule.step === "number") return rule.step > 0;
  if (rule && Array.isArray(rule.bins) && rule.bins.length) {
    return rule.bins.every(
      (b: any, i: number) =>
        typeof b?.value === "number" && (i === rule.bins.length - 1 ? b.lt === undefined : typeof b.lt === "number")
    );
  }
  return false;
}

/** Apply one rule. */
export function applyRule(value: number, rule: RoundingRule): number {
  if ("bins" in rule) {
    for (const b of rule.bins) if (b.lt === undefined || value < b.lt) return b.value;
    return rule.bins[rule.bins.length - 1].value;
  }
  const clamped = Math.min(rule.max ?? Infinity, Math.max(rule.min ?? -Infinity, value));
  const rounded = Math.round(clamped / rule.step) * rule.step;
  return Number(rounded.toPrecision(12)); // no binary noise like 0.30000000000000004
}

/**
 * Apply the campaign's rules (over the defaults) to named values. Values without a rule are left
 * out: nothing leaves the phone unrounded unless the campaign explicitly allows it with a rule.
 */
export function roundForUpload(
  values: Record<string, number>,
  campaignRules: RoundingRules,
  defaults: RoundingRules = DEFAULT_SIGNATURE_ROUNDING
): Record<string, number> {
  const rules = { ...defaults, ...campaignRules };
  const out: Record<string, number> = {};
  for (const [name, value] of Object.entries(values)) {
    const rule = rules[name];
    if (rule && Number.isFinite(value)) out[name] = applyRule(value, rule);
  }
  return out;
}
