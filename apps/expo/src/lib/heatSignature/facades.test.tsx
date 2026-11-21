import { describe, expect, it } from "@jest/globals";

import { Footprint, Neighbourhood, overlap, edgesOf } from "./facades";

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
