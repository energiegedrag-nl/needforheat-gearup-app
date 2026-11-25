import { describe, expect, it } from "@jest/globals";

import { progressFraction, showProgress, timeLeft, updateExpected } from "./progress";

describe("progress of a slow step", () => {
  it("shows a bar only after a few seconds", () => {
    expect(showProgress(1)).toBe(false);
    expect(showProgress(3)).toBe(true);
  });

  it("fills linearly up to the expected time, then creeps on without reaching the end", () => {
    expect(progressFraction(5, 10)).toBeCloseTo(0.425);
    expect(progressFraction(10, 10)).toBeCloseTo(0.85);
    const later = progressFraction(15, 10);
    expect(later).toBeGreaterThan(0.85);
    expect(progressFraction(100, 10)).toBeLessThan(0.95);
    expect(progressFraction(20, 10)).toBeGreaterThan(later);
  });

  it("has no bar without an expected time", () => {
    expect(progressFraction(5, 0)).toBe(0);
  });

  it("says how many seconds are left, then 'almost', then 'longer than usual'", () => {
    expect(timeLeft(4, 12)).toEqual({ kind: "seconds", value: 8 });
    expect(timeLeft(12, 12)).toEqual({ kind: "almost" });
    expect(timeLeft(20, 12)).toEqual({ kind: "longer" });
  });

  it("learns the expected time as a moving average", () => {
    expect(updateExpected(undefined, 10)).toBe(10);
    expect(updateExpected(10, 20)).toBeCloseTo(14);
    expect(updateExpected(10, 0)).toBe(10);
  });
});
