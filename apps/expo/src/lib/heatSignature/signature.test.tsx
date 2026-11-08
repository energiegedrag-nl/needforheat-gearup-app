import { describe, expect, it } from "@jest/globals";

import referenceData from "./rvo_voorbeeldwoningen_2022_grondgebonden.json";
import fixtures from "./signature.fixtures.json";
import { computeSignature, METHODS, normaliseDwellingType, normaliseLabel, ReferenceData, roundSignature } from "./signature";

const refs = referenceData as unknown as ReferenceData;
const DECIMALS = { H__W_K_1: 2, C__Wh_K_1: 1, tau__h: 3, Asol__m2: 3, Ainf__cm2: 1 } as const;

describe("heat signature, compared with AnonyMate", () => {
  for (const c of fixtures.cases as any[]) {
    for (const m of METHODS) {
      it(`${c.input.name} (${m})`, () => {
        const expected = c.expected[m];
        const got = computeSignature(c.input, m, refs);
        if (expected.H__W_K_1 === null) {
          expect(got).toBeNull();
          return;
        }
        expect(got).not.toBeNull();
        for (const [k, d] of Object.entries(DECIMALS)) {
          expect(Math.abs((got as any)[k] - expected[k])).toBeLessThanOrEqual(1.01 * 10 ** -d);
        }
        expect(got!.woningtype_gebruikt__cat).toBe(expected.woningtype_gebruikt__cat);
      });
    }
  }
});

describe("helpers", () => {
  it("normalises labels and dwelling types like AnonyMate", () => {
    expect(normaliseLabel("Label A++")).toBe("A++");
    expect(normaliseLabel("x")).toBeNull();
    expect(normaliseDwellingType("Twee-onder-een-kap / rijwoning hoek Rijwoning")).toBe("hoekwoning");
    expect(normaliseDwellingType("Vrijstaande woning")).toBe("vrijstaand");
    expect(normaliseDwellingType("Appartement")).toBeNull();
  });

  it("rounds to the given steps", () => {
    const sig = computeSignature((fixtures.cases as any[])[2].input, "passend", refs)!;
    const r = roundSignature(sig, { H__W_K_1: 25 });
    expect(r.H__W_K_1 % 25).toBe(0);
  });
});
