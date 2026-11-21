import { describe, expect, it } from "@jest/globals";

import { chooseVerblijfsobject, splitAddress, tileAround } from "./publicData";
import { applyUhiToH, uhiForPostcode } from "./uhi";

const vbo = (huisnummer: number, huisletter: string | null = null, toevoeging: string | null = null) => ({
  properties: { openbare_ruimte_naam: "Achter het Oude Stadhuis", huisnummer, huisletter, toevoeging },
});

describe("finding the home without sending the address", () => {
  it("splits the address text of utils/geocoding", () => {
    expect(splitAddress("Achter het Oude Stadhuis 4A, 3811 CH Amersfoort, Nederland")).toEqual({
      postcode: "3811CH",
      street: "Achter het Oude Stadhuis 4A",
    });
    expect(splitAddress("zonder postcode")).toBeNull();
  });

  it("chooses the verblijfsobject of the address among those of the postcode", () => {
    const all = [vbo(4), vbo(4, "A"), vbo(14), vbo(4, "A", "bis")];
    const pick = (street: string) => chooseVerblijfsobject(all, street)?.properties;
    expect(pick("Achter het Oude Stadhuis 4A")).toMatchObject({ huisnummer: 4, huisletter: "A", toevoeging: null });
    expect(pick("Achter het Oude Stadhuis 4A bis")).toMatchObject({ toevoeging: "bis" });
    expect(pick("Achter het Oude Stadhuis 14")).toMatchObject({ huisnummer: 14 });
    expect(pick("Achter het Oude Stadhuis 5")).toBeUndefined();
  });

  it("asks for a grid-aligned tile, not one centred on the home", () => {
    expect(tileAround(155110.78, 463133.27)).toBe("154950,462950,155250,463250");
    expect(tileAround(155199, 463001)).toBe(tileAround(155001, 463199));
  });

  it("looks up the heat island per PC4 from the bundled table", () => {
    const v = uhiForPostcode("1011 AB");
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(0.5);
    expect(uhiForPostcode("0000")).toBeNull();
  });

  it("folds the heat island into H: 1 K makes H 8.4% smaller, unknown leaves it", () => {
    expect(applyUhiToH(200, 1)).toBeCloseTo(200 * (10.89 / 11.89), 6);
    expect(applyUhiToH(200, null)).toBe(200);
    expect(applyUhiToH(200, 1, 0)).toBe(200);
  });
});
