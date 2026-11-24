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
 * - With the LoD1.3 parts of the 3DBAG (`setParts`), only shared wall at least 4 m high counts for
 *   the neighbours: two semi-detached houses whose garages touch are no terrace of four. The
 *   height is measured about every metre along the shared wall: per side the height above the
 *   ground of the nearest LoD1.3 part of that building (70th percentile of its roof minus the
 *   ground level); the wall is as high as the lower side. An unknown height counts as high, so
 *   without parts the rule stays as above. In AnonyMate (PR #96, tested 24-11-2026 against
 *   142,946 NTA 8800 labels in four areas): twee_onder_een_kap 62% -> 82% right, all dwellings
 *   94.5% -> 95.0%.
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
export const MIN_WALL_HEIGHT__m = 4.0; // lower: a wall between garages or sheds (AnonyMate, 24-11-2026)
const WALL_STEP__m = 1.0; // distance between the points where the wall height is measured
const WALL_REACH__m = 1.0; // how far a LoD1.3 part may lie from such a point
const MAX_HEIGHT__m = 400; // a part higher above the ground than this: height unknown
const MAX_BLOCK = 500; // stop walking a block (a very long row) at this size
/** At most this many buildings whose LoD1.3 parts are asked for per home (see `around`). */
export const MAX_AROUND = 12;
const AROUND_STEPS = 2; // the neighbours and theirs: enough to tell hoekwoning from twee_onder_een_kap

export type Ring = number[][]; // [[x, y], ...] in RD metres; closing point optional
export type Footprint = {
  id: string;
  /** Polygon rings, first the outer ring, then holes; a multipolygon gives several of these. */
  polygons: Ring[][];
  /** The building has a dwelling (BAG gebruiksdoel contains "woonfunctie"). */
  dwelling: boolean;
};
/** A LoD1.3 part of a building (3DBAG): its footprint rings and its height above the ground. */
export type Part = { pand: string; rings: Ring[]; height__m: number | null };

type Edge = { x1: number; y1: number; x2: number; y2: number; L: number; ux: number; uy: number };
/** A stretch of an own edge covered by an edge of another building, and the covered length. */
type Stretch = { x1: number; y1: number; x2: number; y2: number; length: number };

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

/**
 * The stretch of edge a between the projections of the ends of edge b (as in AnonyMate's
 * `covered_segments`), with the covered length `length` as counted for the neighbours.
 */
function stretchOf(a: Edge, b: Edge, length: number): Stretch {
  const s1 = (b.x1 - a.x1) * a.ux + (b.y1 - a.y1) * a.uy;
  const s2 = (b.x2 - a.x1) * a.ux + (b.y2 - a.y1) * a.uy;
  const lo = Math.min(Math.max(Math.min(s1, s2), 0), a.L);
  const hi = Math.min(Math.max(Math.max(s1, s2), 0), a.L);
  return { x1: a.x1 + lo * a.ux, y1: a.y1 + lo * a.uy, x2: a.x1 + hi * a.ux, y2: a.y1 + hi * a.uy, length };
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

/** Prepared footprints: edges and bounding boxes, by id; optionally the LoD1.3 parts. */
export class Neighbourhood {
  private items = new Map<string, { fp: Footprint; edges: Edge[]; box: Box }>();
  private parts = new Map<string, { height: number | null; edges: Edge[] }[]>();

  constructor(footprints: Footprint[]) {
    for (const fp of footprints) {
      const edges = edgesOf(fp);
      if (edges.length) this.items.set(fp.id, { fp, edges, box: boxOf(edges) });
    }
  }

  has(id: string) {
    return this.items.has(id);
  }

  /**
   * The LoD1.3 parts of (some of) the buildings (replacing earlier ones): from then on a shared
   * wall makes neighbours only when at least 2 m of it is at least 4 m high. Buildings without
   * parts have an unknown height, which counts as high.
   */
  setParts(parts: Part[]) {
    this.parts.clear();
    for (const p of parts) {
      const height = typeof p.height__m === "number" && Number.isFinite(p.height__m) ? p.height__m : null;
      const edges = edgesOf({ id: p.pand, polygons: [p.rings], dwelling: false });
      const list = this.parts.get(p.pand) ?? [];
      list.push({ height, edges });
      this.parts.set(p.pand, list);
    }
  }

  /**
   * Height above the ground at (x, y) of the LoD1.3 part of building `id` nearest to it; a
   * building with one part has that height everywhere. Null when unknown: no parts, or none within
   * 1 m.
   */
  heightAt(id: string, x: number, y: number): number | null {
    const parts = this.parts.get(id);
    if (!parts?.length) return null;
    if (parts.length === 1) return parts[0].height;
    let best = Infinity;
    let height: number | null = null;
    for (const part of parts) {
      for (const e of part.edges) {
        const t = Math.min(Math.max((x - e.x1) * e.ux + (y - e.y1) * e.uy, 0), e.L);
        const d = Math.hypot(x - (e.x1 + t * e.ux), y - (e.y1 + t * e.uy));
        if (d < best) {
          best = d;
          height = part.height;
        }
      }
    }
    return best <= WALL_REACH__m ? height : null;
  }

  /**
   * Per edge of `id` the length shared with other buildings, and per other building the shared
   * length and the shared stretches along the edges of `id`.
   */
  private shared(id: string) {
    const own = this.items.get(id)!;
    const perEdge = own.edges.map(() => 0);
    const perBuilding = new Map<string, number>();
    const stretches = new Map<string, Stretch[]>();
    for (const [otherId, other] of this.items) {
      if (otherId === id || !near(own.box, other.box)) continue;
      let total = 0;
      const list: Stretch[] = [];
      own.edges.forEach((a, i) => {
        for (const b of other.edges) {
          const ov = overlap(a, b);
          if (!(ov > 0)) continue;
          perEdge[i] += ov;
          total += ov;
          list.push(stretchOf(a, b, ov));
        }
      });
      if (total > 0) {
        perBuilding.set(otherId, total);
        stretches.set(otherId, list);
      }
    }
    return { perEdge, perBuilding, stretches };
  }

  /**
   * The part of the shared wall of `id` and `other` that is at least `threshold` high [m]: per
   * measuring point (about every metre) the lower of the two sides; an unknown height counts as
   * high.
   */
  highWall(id: string, other: string, threshold = MIN_WALL_HEIGHT__m): number {
    if (!this.items.has(id)) return 0;
    let high = 0;
    for (const s of this.shared(id).stretches.get(other) ?? []) high += this.highPart(id, other, s, threshold);
    return high;
  }

  private highPart(id: string, other: string, s: Stretch, threshold: number) {
    const n = Math.max(1, Math.round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / WALL_STEP__m));
    let high = 0;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = s.x1 + t * (s.x2 - s.x1);
      const y = s.y1 + t * (s.y2 - s.y1);
      const a = this.heightAt(id, x, y);
      const b = this.heightAt(other, x, y);
      if (a === null || b === null || Math.min(a, b) >= threshold) high += s.length / n;
    }
    return high;
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

  /**
   * Buildings with a dwelling that share at least 2 m of wall with `id`; with LoD1.3 parts
   * (`setParts`), at least 2 m of wall at least 4 m high. `heights` false ignores the parts.
   */
  neighbours(id: string, heights = true): string[] {
    if (!this.items.has(id)) return [];
    const { perBuilding, stretches } = this.shared(id);
    const out: string[] = [];
    for (const [other, length] of perBuilding) {
      if (!this.items.get(other)!.fp.dwelling || length < MIN_NEIGHBOUR_WALL__m) continue;
      if (heights && this.parts.size > 0) {
        const high = stretches.get(other)!.reduce((sum, s) => sum + this.highPart(id, other, s, MIN_WALL_HEIGHT__m), 0);
        if (high < MIN_NEIGHBOUR_WALL__m) continue;
      }
      out.push(other);
    }
    return out;
  }

  /**
   * The buildings whose LoD1.3 parts decide the dwelling type of `id`: itself, the dwelling
   * buildings it shares at least 2 m of wall with (whatever the height), and theirs. Two steps
   * are enough to tell hoekwoning from twee_onder_een_kap. At most MAX_AROUND, nearest first.
   */
  around(id: string): string[] {
    const out = [id];
    let front = [id];
    for (let step = 0; step < AROUND_STEPS; step++) {
      const next: string[] = [];
      for (const cur of front) {
        for (const nb of this.neighbours(cur, false)) {
          if (out.includes(nb) || out.length >= MAX_AROUND) continue;
          out.push(nb);
          next.push(nb);
        }
      }
      front = next;
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

const PAND_PREFIX = /^NL\.IMBAG\.Pand\./;

/**
 * The LoD1.3 parts of one building from a 3DBAG API item (a CityJSON feature with the transform
 * in its metadata): per roof surface of the LoD1.3 solid its footprint and its height above the
 * ground, b3_h_dak_70p of the surface (else the mean height of its corners) minus b3_h_maaiveld
 * of the building. Heights below 0 or above 400 m are unknown (as in AnonyMate).
 */
export function partsFromCityJson(body: any): Part[] {
  const feature = body?.feature ?? body;
  const transform = body?.metadata?.transform ?? feature?.transform;
  const scale: number[] = transform?.scale ?? [1, 1, 1];
  const shift: number[] = transform?.translate ?? [0, 0, 0];
  const vertices: number[][] = feature?.vertices ?? [];
  const objects: Record<string, any> = feature?.CityObjects ?? {};
  const coordinate = (v: number, axis: number) => vertices[v][axis] * scale[axis] + shift[axis];
  const out: Part[] = [];
  for (const [key, object] of Object.entries(objects)) {
    if (object?.type !== "BuildingPart") continue;
    const parentKey: string = object.parents?.[0] ?? key.replace(/-\d+$/, "");
    const ground = objects[parentKey]?.attributes?.b3_h_maaiveld;
    const geometry = (object.geometry ?? []).find((g: any) => String(g?.lod) === "1.3");
    for (const { surface, semantic } of surfacesOf(geometry)) {
      if (semantic?.type !== "RoofSurface") continue;
      if (!surface.every(ring => ring.every(v => Array.isArray(vertices[v])))) continue;
      const rings: Ring[] = surface.map(ring => ring.map(v => [coordinate(v, 0), coordinate(v, 1)]));
      const zs = surface.flat().map(v => coordinate(v, 2));
      const roof =
        typeof semantic.b3_h_dak_70p === "number" ? semantic.b3_h_dak_70p : zs.reduce((s, z) => s + z, 0) / zs.length;
      const height = typeof ground === "number" ? roof - ground : NaN;
      out.push({
        pand: parentKey.replace(PAND_PREFIX, ""),
        rings,
        height__m: Number.isFinite(height) && height >= 0 && height <= MAX_HEIGHT__m ? height : null,
      });
    }
  }
  return out;
}

/** The surfaces (rings of vertex indices) of a Solid, MultiSolid or CompositeSolid, with their semantics. */
function surfacesOf(geometry: any): { surface: number[][]; semantic: any }[] {
  if (!geometry) return [];
  const solid = geometry.type === "Solid";
  const several = geometry.type === "MultiSolid" || geometry.type === "CompositeSolid";
  if (!solid && !several) return [];
  const solids: number[][][][][] = solid ? [geometry.boundaries] : geometry.boundaries ?? [];
  const values = solid ? [geometry.semantics?.values] : geometry.semantics?.values ?? [];
  const surfaces: any[] = geometry.semantics?.surfaces ?? [];
  const out: { surface: number[][]; semantic: any }[] = [];
  solids.forEach((shells, i) =>
    (shells ?? []).forEach((shell, j) =>
      (shell ?? []).forEach((surface, k) => {
        const index = values?.[i]?.[j]?.[k];
        out.push({ surface, semantic: typeof index === "number" ? surfaces[index] : null });
      })
    )
  );
  return out;
}
