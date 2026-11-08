import { describe, expect, it } from "@jest/globals";

import { applyRule, DEFAULT_SIGNATURE_ROUNDING, parseRoundingRules, roundForUpload } from "./rounding";

describe("rounding rules", () => {
  it("rounds to a step and clamps the tails", () => {
    const rule = { step: 25, min: 50, max: 600 };
    expect(applyRule(137, rule)).toBe(125);
    expect(applyRule(13, rule)).toBe(50);
    expect(applyRule(2000, rule)).toBe(600);
    expect(applyRule(0.3, { step: 0.1 })).toBe(0.3);
  });

  it("maps values to bins, with an open last bin", () => {
    const rule = { bins: [{ lt: 50, value: 25 }, { lt: 150, value: 100 }, { value: 200 }] };
    expect(applyRule(10, rule)).toBe(25);
    expect(applyRule(50, rule)).toBe(100);
    expect(applyRule(149.9, rule)).toBe(100);
    expect(applyRule(5000, rule)).toBe(200);
  });

  it("parses campaign JSON and ignores invalid rules", () => {
    const rules = parseRoundingRules(
      '{"a":{"step":5},"b":{"bins":[{"lt":1,"value":0},{"value":2}]},"c":{"step":0},"d":{"bins":[{"value":1},{"value":2}]}}'
    );
    expect(Object.keys(rules).sort()).toEqual(["a", "b"]);
    expect(parseRoundingRules("not json")).toEqual({});
    expect(parseRoundingRules(null)).toEqual({});
  });

  it("uploads only values with a rule; campaign rules override the defaults", () => {
    const out = roundForUpload(
      { heat_tr_building_cond__W_K_1: 233, th_mass_building__Wh_K_1: 12144, unknown__0: 3 },
      { th_mass_building__Wh_K_1: { step: 5000 } }
    );
    expect(out).toEqual({ heat_tr_building_cond__W_K_1: 220, th_mass_building__Wh_K_1: 10000 });
  });

  it("has defaults for the four signature quantities", () => {
    expect(Object.keys(DEFAULT_SIGNATURE_ROUNDING).sort()).toEqual([
      "aperture_inf__cm2",
      "aperture_sol__m2",
      "heat_tr_building_cond__W_K_1",
      "th_mass_building__Wh_K_1",
    ]);
  });
});
