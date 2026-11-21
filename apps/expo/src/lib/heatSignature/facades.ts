/**
 * Exposed façade per orientation and the dwelling type from the neighbours, from BAG building
 * footprints (pandcontouren) in RD coordinates (EPSG:28992, metres).
 *
 * A port of `anonymate.gevel` (https://github.com/anonymate-nl/anonymate, src/anonymate/gevel.py)
 * for the few buildings around one dwelling, without numpy:
 *
 * - Per footprint edge the outward normal follows from the ring direction (outer ring
 *   counter-clockwise, holes clockwise: the building lies left of every edge; rings are oriented
 *   here, whatever the source gives), the sector (8 x 45 degrees, compass, clockwise from north)
 *   from the compass azimuth of that normal.
 * - An edge is (partly) shared when an edge of another building lies within 0.5 m of it and runs
 *   nearly parallel (angle < 15 degrees); the shared length is the overlap with all such edges,
 *   the exposed length the rest. Shared walls get no sun, whatever the neighbour is.
 * - The main axis of a building is the direction of its longest edge; a side façade is an exposed
 *   edge whose normal is perpendicular to the main axis (within 45 degrees).
 * - Two buildings with a dwelling are neighbours when they share at least 2 m of wall; neighbours
 *   joined to each other form a block. No neighbours: vrijstaand; a block of two:
 *   twee_onder_een_kap; one neighbour in a longer block: hoekwoning; two or more: tussenwoning.
 *   Against EP-online this gave 90-91% right (AnonyMate, near Zwolle and Leiden), against 69-70%
 *   with the 3DBAG party-wall share.
 *
 * The RD grid deviates at most about two degrees from true north in the Netherlands (meridian
 * convergence); that is not corrected, as in AnonyMate.
 *
 * This file has no imports, so it also runs directly under Node (type stripping).
 */

export const SECTORS = 8;
/** Compass order of the sectors. */
export const SECTOR_NAMES = ["n", "no", "o", "zo", "z", "zw", "w", "nw"] as const;
const TOLERANCE__m = 0.5;
const SIN_ANGLE_MAX__0 = 0.26; // sin(15 degrees): "nearly parallel"
const SIDE_COS_MAX__0 = 0.7071; // normal at most 45 degrees from the perpendicular to the main axis
export const MIN_NEIGHBOUR_WALL__m = 2.0; // less shared wall: touching (a corner, a fence)
const MAX_BLOCK = 500; // stop walking a block (a very long row) at this size

export type Ring = number[][]; // [[x, y], ...] in RD metres; closing point optional
export type Footprint = {
  id: string;
  /** Polygon rings, first the outer ring, then holes; a multipolygon gives several of these. */
  polygons: Ring[][];
  /** The building has a dwelling (BAG gebruiksdoel contains "woonfunctie"). */
  dwelling: boolean;
};

type Edge = { x1: number; y1: number; x2: number; y2: number; L: number; ux: number; uy: number };

function signedArea(ring: Ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** The edges of a footprint, rings oriented so the building lies left of every edge. */
export function edgesOf(fp: Footprint): Edge[] {
  const out: Edge[] = [];
  for (const polygon of fp.polygons) {
    polygon.forEach((raw, i) => {
      let ring = raw.slice();
      const last = ring[ring.length - 1];
      if (ring.length > 1 && last[0] === ring[0][0] && last[1] === ring[0][1]) ring = ring.slice(0, -1);
      if (ring.length < 3) return;
      const ccw = signedArea(ring) > 0;
      if ((i === 0) !== ccw) ring.reverse(); // outer ring counter-clockwise, holes clockwise
      for (let k = 0; k < ring.length; k++) {
        const [x1, y1] = ring[k];
        const [x2, y2] = ring[(k + 1) % ring.length];
        const L = Math.hypot(x2 - x1, y2 - y1);
        if (L > 1e-6) out.push({ x1, y1, x2, y2, L, ux: (x2 - x1) / L, uy: (y2 - y1) / L });
      }
    });
  }
  return out;
}

/** Length of edge a covered by edge b (near-parallel, within the tolerance); 0 otherwise. */
export function overlap(a: Edge, b: Edge, tol = TOLERANCE__m): number {
  if (Math.abs(a.ux * b.uy - a.uy * b.ux) > SIN_ANGLE_MAX__0) return 0;
  const d1x = b.x1 - a.x1;
  const d1y = b.y1 - a.y1;
  const d2x = b.x2 - a.x1;
  const d2y = b.y2 - a.y1;
  const s1 = d1x * a.ux + d1y * a.uy;
  const n1 = -d1x * a.uy + d1y * a.ux;
  const s2 = d2x * a.ux + d2y * a.uy;
  const n2 = -d2x * a.uy + d2y * a.ux;
  const dn = n2 - n1;
  const clip = (v: number) => Math.min(1, Math.max(0, v));
  let tLo: number;
  let tHi: number;
  if (Math.abs(dn) < 1e-9) {
    tLo = 0;
    tHi = Math.abs(n1) <= tol ? 1 : 0;
  } else {
    const ta = (-tol - n1) / dn;
    const tb = (tol - n1) / dn;
    tLo = clip(Math.min(ta, tb));
    tHi = clip(Math.max(ta, tb));
  }
  if (!(tHi > tLo)) return 0;
  const sa = s1 + (s2 - s1) * tLo;
  const sb = s1 + (s2 - s1) * tHi;
  const ov = Math.min(Math.max(Math.max(sa, sb), 0), a.L) - Math.min(Math.max(Math.min(sa, sb), 0), a.L);
  return Math.max(ov, 0);
}

type Box = { x0: number; y0: number; x1: number; y1: number };
function boxOf(edges: Edge[]): Box {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const e of edges) {
    b.x0 = Math.min(b.x0, e.x1, e.x2);
    b.y0 = Math.min(b.y0, e.y1, e.y2);
    b.x1 = Math.max(b.x1, e.x1, e.x2);
    b.y1 = Math.max(b.y1, e.y1, e.y2);
  }
  return b;
}
const near = (a: Box, b: Box, tol = TOLERANCE__m) =>
  a.x0 - tol <= b.x1 && b.x0 - tol <= a.x1 && a.y0 - tol <= b.y1 && b.y0 - tol <= a.y1;

/** Prepared footprints: edges and bounding boxes, by id. */
export class Neighbourhood {
  private items = new Map<string, { fp: Footprint; edges: Edge[]; box: Box }>();

  constructor(footprints: Footprint[]) {
    for (const fp of footprints) {
      const edges = edgesOf(fp);
      if (edges.length) this.items.set(fp.id, { fp, edges, box: boxOf(edges) });
    }
  }

  has(id: string) {
    return this.items.has(id);
  }

  /** Per edge of `id` the length shared with other buildings, and the shared length per other building. */
  private shared(id: string) {
    const own = this.items.get(id)!;
    const perEdge = own.edges.map(() => 0);
    const perBuilding = new Map<string, number>();
    for (const [otherId, other] of this.items) {
      if (otherId === id || !near(own.box, other.box)) continue;
      let total = 0;
      own.edges.forEach((a, i) => {
        for (const b of other.edges) {
          const ov = overlap(a, b);
          perEdge[i] += ov;
          total += ov;
        }
      });
      if (total > 0) perBuilding.set(otherId, total);
    }
    return { perEdge, perBuilding };
  }

  /**
   * Exposed wall length per sector of building `id`, total and the side-façade part [m], 8 values
   * each (N NE E SE S SW W NW); null when the building is unknown or has no exposed wall.
   */
  exposedPerSector(id: string): { total: number[]; side: number[] } | null {
    const own = this.items.get(id);
    if (!own) return null;
    const { perEdge } = this.shared(id);
    const longest = own.edges.reduce((m, e) => (e.L > m.L ? e : m), own.edges[0]);
    const total = new Array(SECTORS).fill(0);
    const side = new Array(SECTORS).fill(0);
    own.edges.forEach((e, i) => {
      const exposed = Math.max(e.L - perEdge[i], 0);
      if (!(exposed > 0)) return;
      // the building is on the left of (ux, uy): outward = to the right = (uy, -ux)
      const az = (((Math.atan2(e.uy, -e.ux) * 180) / Math.PI) % 360 + 360) % 360;
      const sector = Math.floor((az + 22.5) / 45) % SECTORS;
      total[sector] += exposed;
      if (Math.abs(e.uy * longest.ux - e.ux * longest.uy) <= SIDE_COS_MAX__0) side[sector] += exposed;
    });
    return total.some(v => v > 0) ? { total, side } : null;
  }

  /** Buildings with a dwelling that share at least 2 m of wall with `id`. */
  neighbours(id: string): string[] {
    if (!this.items.has(id)) return [];
    const out: string[] = [];
    for (const [other, length] of this.shared(id).perBuilding) {
      if (this.items.get(other)!.fp.dwelling && length >= MIN_NEIGHBOUR_WALL__m) out.push(other);
    }
    return out;
  }

  /**
   * Number of neighbouring dwelling buildings and the size of the block (connected neighbours,
   * the building itself included). `complete` is false when the block reached the edge of the
   * fetched area or MAX_BLOCK: then the block may be longer than counted.
   */
  neighboursAndBlock(id: string, inside?: (id: string) => boolean) {
    const first = this.neighbours(id);
    const seen = new Set([id]);
    const queue = [id];
    let complete = true;
    while (queue.length && seen.size < MAX_BLOCK) {
      const cur = queue.shift()!;
      if (inside && !inside(cur)) complete = false;
      for (const nb of cur === id ? first : this.neighbours(cur)) {
        if (!seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
    if (queue.length) complete = false;
    return { neighbours: first.length, block: seen.size, complete };
  }
}
