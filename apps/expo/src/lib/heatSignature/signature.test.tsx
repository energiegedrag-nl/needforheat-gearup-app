import { describe, expect, it } from "@jest/globals";

import referenceData from "./rvo_voorbeeldwoningen_2022_grondgebonden.json";
import fixtures from "./signature.fixtures.json";
import {
  computeSignature,
  dwellingTypeFromNeighbours,
  METHODS,
  normaliseDwellingType,
  normaliseLabel,
  R_PER_ORIENTATION,
  ReferenceData,
} from "./signature";

const refs = referenceData as unknown as ReferenceData;
const DECIMALS = {
  H__W_K_1: 2,
  C__Wh_K_1: 1,
  tau__h: 3,
  Asol__m2: 3,
  Ainf__cm2: 1,
  qv10__dm3_s_1_m_2: 3,
  ELA__cm2: 3,
} as const;
// AnonyMate's asol_bron__str -> the app's category
const ASOL_SOURCE: Record<string, string> = {
  "gevelrichting (BAG-pand, R_o De Bilt)": "gevelrichting",
  "gemiddelde verhouding (gevelrichting onbekend)": "gemiddeld",
  "gemiddelde verhouding (methode is richtingsgemiddeld)": "standaard",
};

describe("heat signature, compared with AnonyMate (tools/make_fixtures.py)", () => {
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
          if (expected[k] === null || expected[k] === undefined) continue;
          expect(Math.abs((got as any)[k] - expected[k])).toBeLessThanOrEqual(1.01 * 10 ** -d);
        }
        expect(got!.woningtype_gebruikt__cat).toBe(expected.woningtype_gebruikt__cat);
        expect(got!.asol_bron__cat).toBe(ASOL_SOURCE[expected.asol_bron__str]);
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

  it("orders the irradiance ratios south > east/west > north, mean N/E/S/W = 0.731", () => {
    const [n, , e, , s, , w] = R_PER_ORIENTATION;
    expect(s).toBeGreaterThan(e);
    expect(e).toBeGreaterThan(n);
    expect(Math.abs((n + e + s + w) / 4 - 0.731)).toBeLessThan(1e-3);
  });

  it("derives the dwelling type from the neighbours", () => {
    expect(dwellingTypeFromNeighbours(0, 1)).toBe("vrijstaand");
    expect(dwellingTypeFromNeighbours(1, 2)).toBe("twee_onder_een_kap");
    expect(dwellingTypeFromNeighbours(1, 6)).toBe("hoekwoning");
    expect(dwellingTypeFromNeighbours(2, 6)).toBe("tussenwoning");
    expect(dwellingTypeFromNeighbours(null, null)).toBeNull();
  });
});
