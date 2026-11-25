import { describe, expect, it } from "@jest/globals";

import { Footprint, Neighbourhood, Part, Ring, overlap, edgesOf, partsFromCityJson } from "./facades";

// A rectangle w x d with its lower-left corner at (x, y); RD metres, x east, y north.
const rect = (id: string, x: number, y: number, w: number, d: number, dwelling = true): Footprint => ({
  id,
  dwelling,
  polygons: [
    [
      [
        [x, y],
        [x + w, y],
        [x + w, y + d],
        [x, y + d],
        [x, y],
      ],
    ],
  ],
});
// the same, clockwise (rings are oriented by the code, whatever the source gives)
const rectCw = (id: string, x: number, y: number, w: number, d: number): Footprint => {
  const r = rect(id, x, y, w, d);
  r.polygons[0][0].reverse();
  return r;
};

describe("façades from footprints", () => {
  it("a detached house has all four sides exposed, in the right sectors", () => {
    const hood = new Neighbourhood([rect("a", 0, 0, 10, 8)]);
    const f = hood.exposedPerSector("a")!;
    // N, E, S, W = sectors 0, 2, 4, 6
    expect(f.total[0]).toBeCloseTo(10);
    expect(f.total[4]).toBeCloseTo(10);
    expect(f.total[2]).toBeCloseTo(8);
    expect(f.total[6]).toBeCloseTo(8);
    expect(hood.neighboursAndBlock("a")).toEqual({ neighbours: 0, block: 1, complete: true });
  });

  it("ring direction of the source does not matter", () => {
    const f = new Neighbourhood([rectCw("a", 0, 0, 10, 8)]).exposedPerSector("a")!;
    expect(f.total[0]).toBeCloseTo(10);
    expect(f.total[2]).toBeCloseTo(8);
  });

  it("a row of four: shared walls get no sun; ends are corner houses, the rest mid-terrace", () => {
    // houses 6 m wide (east-west), 9 m deep; front south, back north
    const row = [0, 1, 2, 3].map(i => rect(`h${i}`, i * 6, 0, 6, 9));
    const hood = new Neighbourhood(row);
    const mid = hood.exposedPerSector("h1")!;
    expect(mid.total[0]).toBeCloseTo(6);
    expect(mid.total[4]).toBeCloseTo(6);
    expect(mid.total[2]).toBeCloseTo(0);
    expect(mid.total[6]).toBeCloseTo(0);
    const end = hood.exposedPerSector("h0")!;
    expect(end.total[6]).toBeCloseTo(9); // gable to the west
    expect(end.side[6]).toBeCloseTo(9); // main axis = the 9 m depth (longest edge): the gable is a side façade
    expect(hood.neighboursAndBlock("h1")).toMatchObject({ neighbours: 2, block: 4 });
    expect(hood.neighboursAndBlock("h0")).toMatchObject({ neighbours: 1, block: 4 });
  });

  it("a semi-detached pair is a block of two", () => {
    const hood = new Neighbourhood([rect("a", 0, 0, 7, 10), rect("b", 7, 0, 7, 10)]);
    expect(hood.neighboursAndBlock("a")).toMatchObject({ neighbours: 1, block: 2 });
  });

  it("a shed against the house shades the wall but is no neighbour", () => {
    const hood = new Neighbourhood([rect("a", 0, 0, 10, 8), rect("shed", 10, 0, 3, 4, false)]);
    const f = hood.exposedPerSector("a")!;
    expect(f.total[2]).toBeCloseTo(4); // east wall 8 m, 4 m against the shed
    expect(hood.neighboursAndBlock("a").neighbours).toBe(0);
  });

  it("touching at a corner or along less than 2 m does not make neighbours", () => {
    const hood = new Neighbourhood([rect("a", 0, 0, 10, 8), rect("b", 10, 7, 6, 6)]);
    expect(hood.neighboursAndBlock("a").neighbours).toBe(0);
  });

  it("overlap needs near-parallel edges within 0.5 m", () => {
    const [a] = edgesOf(rect("a", 0, 0, 10, 8));
    const [b] = edgesOf(rect("b", 2, -0.3, 4, 1));
    const [c] = edgesOf(rect("c", 2, -0.8, 4, 1));
    expect(overlap(a, b)).toBeCloseTo(4);
    expect(overlap(a, c)).toBe(0);
  });
});

// P1 | P2 + garage | garage + P3 | P4, as tests/test_muurhoogte.py in AnonyMate: the houses are
// 10 m deep and 8 m high, the garages 6 m deep and 3 m high
const box = (x0: number, x1: number, y0: number, y1: number): Ring => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const pand = (id: string, ring: Ring): Footprint => ({ id, dwelling: true, polygons: [[ring]] });
const ROW = [
  pand("p1", box(0, 6, 0, 10)),
  pand("p2", [
    [6, 0],
    [15, 0],
    [15, 6],
    [12, 6],
    [12, 10],
    [6, 10],
  ]),
  pand("p3", [
    [15, 0],
    [24, 0],
    [24, 10],
    [18, 10],
    [18, 6],
    [15, 6],
  ]),
  pand("p4", box(24, 30, 0, 10)),
];
const PARTS: Part[] = [
  { pand: "p1", rings: [box(0, 6, 0, 10)], height__m: 8 },
  { pand: "p2", rings: [box(6, 12, 0, 10)], height__m: 8 },
  { pand: "p2", rings: [box(12, 15, 0, 6)], height__m: 3 },
  { pand: "p3", rings: [box(15, 18, 0, 6)], height__m: 3 },
  { pand: "p3", rings: [box(18, 24, 0, 10)], height__m: 8 },
  { pand: "p4", rings: [box(24, 30, 0, 10)], height__m: 8 },
];
const typeOf = (hood: Neighbourhood) => ROW.map(f => hood.neighboursAndBlock(f.id)).map(r => [r.neighbours, r.block]);

describe("height of shared walls (3DBAG LoD1.3 parts)", () => {
  it("without the parts the garages make a terrace of four", () => {
    expect(typeOf(new Neighbourhood(ROW))).toEqual([
      [1, 4],
      [2, 4],
      [2, 4],
      [1, 4],
    ]);
  });

  it("with the parts a wall between garages is low: two semi-detached pairs", () => {
    const hood = new Neighbourhood(ROW);
    hood.setParts(PARTS);
    expect(hood.highWall("p1", "p2")).toBeCloseTo(10);
    expect(hood.highWall("p2", "p3")).toBeCloseTo(0);
    expect(hood.highWall("p2", "p3", 2.5)).toBeCloseTo(6);
    expect(typeOf(hood)).toEqual([
      [1, 2],
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
  });

  it("an unknown height counts as high", () => {
    const hood = new Neighbourhood(ROW);
    hood.setParts(PARTS.filter(p => p.pand !== "p3"));
    expect(hood.neighboursAndBlock("p2")).toMatchObject({ neighbours: 2, block: 4 });
  });

  it("takes the height of the nearest part of the same building", () => {
    const hood = new Neighbourhood(ROW);
    hood.setParts(PARTS);
    expect(hood.heightAt("p2", 15, 3)).toBe(3); // the garage wall
    expect(hood.heightAt("p2", 6, 5)).toBe(8); // the house wall
    expect(hood.heightAt("p2", 40, 3)).toBeNull(); // too far away
    expect(hood.heightAt("p9", 15, 3)).toBeNull(); // no parts
  });

  it("asks for the parts of the neighbours and theirs, whatever the height", () => {
    const hood = new Neighbourhood(ROW);
    expect(hood.around("p1")).toEqual(["p1", "p2", "p3"]);
    expect(hood.around("p2").sort()).toEqual(["p1", "p2", "p3", "p4"]);
    expect(hood.around("elsewhere")).toEqual(["elsewhere"]);
  });

  it("reads the parts from a 3DBAG item: one per LoD1.3 roof surface, height above the ground", () => {
    // RD = translate + scale * vertex; a house roof (b3_h_dak_70p 10.5) and a garage roof (z 5)
    const at = (x: number, y: number, z: number) => [(x - 1000) / 0.5, (y - 2000) / 0.5, z / 0.5];
    const vertices = [
      at(1000, 2000, 10),
      at(1006, 2000, 10),
      at(1006, 2010, 10),
      at(1000, 2010, 10),
      at(1006, 2000, 5),
      at(1009, 2000, 5),
      at(1009, 2006, 5),
      at(1006, 2006, 5),
      at(1000, 2000, 2),
      at(1009, 2000, 2),
      at(1009, 2010, 2),
      at(1000, 2010, 2),
    ];
    const id = "NL.IMBAG.Pand.0123100000000001";
    const body = {
      metadata: { transform: { scale: [0.5, 0.5, 0.5], translate: [1000, 2000, 0] } },
      feature: {
        id,
        vertices,
        CityObjects: {
          [id]: { type: "Building", attributes: { b3_h_maaiveld: 2 }, children: [`${id}-0`] },
          [`${id}-0`]: {
            type: "BuildingPart",
            parents: [id],
            geometry: [
              {
                lod: "1.2",
                type: "Solid",
                boundaries: [[[[0, 1, 2, 3]]]],
                semantics: { surfaces: [{ type: "RoofSurface" }], values: [[0]] },
              },
              {
                lod: "1.3",
                type: "Solid",
                boundaries: [[[[0, 1, 2, 3]], [[4, 5, 6, 7]], [[8, 9, 10, 11]]]],
                semantics: {
                  surfaces: [
                    { type: "GroundSurface" },
                    { type: "RoofSurface", b3_h_dak_70p: 10.5 },
                    { type: "RoofSurface" },
                  ],
                  values: [[1, 2, 0]],
                },
              },
            ],
          },
        },
      },
    };
    const parts = partsFromCityJson(body);
    expect(parts.map(p => [p.pand, p.height__m])).toEqual([
      ["0123100000000001", 8.5],
      ["0123100000000001", 3],
    ]);
    expect(parts[1].rings[0]).toEqual([
      [1006, 2000],
      [1009, 2000],
      [1009, 2006],
      [1006, 2006],
    ]);
    expect(partsFromCityJson(null)).toEqual([]);
  });
});
