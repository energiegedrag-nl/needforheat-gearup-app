/**
 * Heat performance signature (warmteprestatiesignatuur) of one single-family home, from public
 * data only: BAG (construction year, usable area, dwellings in the building), 3DBAG (envelope
 * areas, roof type, storeys) and, when available, the registered energy label (EP-online).
 *
 *   H     effective conductive heat transfer capacity of the envelope  [W/K]
 *   C     effective thermal mass                                       [Wh/K]
 *   tau   effective thermal inertia, C / H                             [h]
 *   Asol  effective horizontal solar aperture                          [m²]
 *   Ainf  effective wind infiltration aperture                         [cm²]
 *
 * A port of `signature.compute` from AnonyMate (https://github.com/anonymate-nl/anonymate,
 * src/anonymate/signature.py), for one dwelling and without façade orientations (the
 * orientation-averaged irradiance ratio is used). The author of AnonyMate makes this port
 * available under the license of this repository. Tests: `signature.test.tsx` compares with
 * values computed by AnonyMate itself (`signature.fixtures.json`).
 *
 * This file has no imports, so it also runs directly under Node (type stripping).
 */

export type DwellingType = "vrijstaand" | "twee_onder_een_kap" | "hoekwoning" | "tussenwoning";
export type Method = "nta8800" | "mwa" | "best" | "ep" | "ep_3dbag" | "passend";
export const METHODS: Method[] = ["nta8800", "mwa", "best", "ep", "ep_3dbag", "passend"];

export type DwellingInput = {
  bouwjaar__yr?: number | null;
  oppervlakte__m2?: number | null; // BAG usable area of the dwelling
  woningtype__cat?: string | null; // registered (EP-online) type, if any
  pand_woningen__0?: number | null; // number of dwellings in the building (BAG)
  aaneengebouwd__bool?: boolean | null;
  daktype__cat?: string | null; // "plat", "plat_meerdere", other = pitched
  bouwlagen__0?: number | null;
  opp_buitenmuur__m2?: number | null; // 3DBAG
  opp_grond__m2?: number | null;
  opp_dak_plat__m2?: number | null;
  opp_dak_schuin__m2?: number | null;
  opp_scheidingsmuur__m2?: number | null;
  energielabel__cat?: string | null; // EP-online
  warmtebehoefte__kWh_m_2_a_1?: number | null;
  nta8800__bool?: boolean | null;
  compactheid__m2_m_2?: number | null;
  label_oppervlakte__m2?: number | null;
};

export type Signature = {
  H__W_K_1: number;
  C__Wh_K_1: number;
  tau__h: number;
  Asol__m2: number;
  Ainf__cm2: number;
  method: Method;
  methode_gebruikt__cat: Exclude<Method, "passend">;
  woningtype_gebruikt__cat: DwellingType;
  isolatieniveau__0: number;
};

/** RVO reference dwellings 2022 (single-family), as in AnonyMate's data file. */
export type ReferenceData = {
  woningen: {
    id: string;
    hoofdvorm: string;
    bouwjaarklasse: string;
    gebruiksoppervlak__m2: number;
    warmtebehoefte_qhnd__kWh_m_2: Record<string, number>;
    bouwdelen: Record<
      string,
      {
        oppervlak__m2: number;
        u__W_m_2_K_1: Record<string, number | null>;
        b_factor__0?: number;
        glastype?: Record<string, string | null>;
      }
    >;
  }[];
};

const A_INF_NL_AVG__cm2 = 108.0;
const GROUND_FACTOR__0 = 0.7;
const R_SI = { wall: 0.13, floor: 0.17, roof: 0.1 };
const R_SE = 0.04;
const ALPHA_SOL__0 = 0.6;
const GLASS_SHARE__0 = 1 - 0.3;
const F_W__0 = 0.9;
const F_SH__0 = 0.9;
const VERTICAL_IRRADIANCE_RATIO__W0 = 0.731;

const MWA_RC_SURCHARGE = 0.15;
const MWA_U_WINDOW_DOOR = 0.9;
const MWA_B_UNHEATED = 0.7;
const MWA_INFILTRATION = 0.5;

const F_Y: [number, number, number][] = [
  [0, 1970, 3.0],
  [1970, 1980, 2.5],
  [1980, 1990, 2.0],
  [1990, 2000, 1.5],
  [2000, 2010, 1.0],
  [2010, 9999, 0.7],
];
const Q_SPEC_PITCHED = 1.0;
const Q_SPEC_FLAT = 0.7;
const F_TYPE: Record<DwellingType, number> = {
  tussenwoning: 1.0,
  hoekwoning: 1.2,
  twee_onder_een_kap: 1.2,
  vrijstaand: 1.4,
};
const FLOW_EXPONENT = 0.67;
const ELA_DP__Pa = 4.0;
const AIR_DENSITY = 1.2;
const LBL_K: Record<number, number> = { 1: 0.23, 2: 0.2877, 3: 0.331 };

// NTA 8800 default Rc by construction period [from, to): wall, ground floor, roof
const RC: [number, number, number, number, number][] = [
  [0, 1965, 0.19, 0.15, 0.22],
  [1965, 1975, 0.43, 0.17, 0.86],
  [1975, 1983, 1.3, 0.52, 1.3],
  [1983, 1988, 1.3, 1.3, 1.3],
  [1988, 1992, 2.0, 1.3, 2.0],
  [1992, 2014, 2.5, 2.5, 2.5],
  [2014, 2015, 3.5, 3.5, 3.5],
  [2015, 2021, 4.5, 3.5, 6.0],
  [2021, 9999, 4.7, 3.7, 6.3],
];
const GGL: [number, number, number][] = [
  [0, 1992, 0.85],
  [1992, 2014, 0.75],
  [2014, 2021, 0.6],
  [2021, 9999, 0.4],
];
const GGL_BY_TYPE: Record<string, number> = {
  enkel: 0.85,
  dubbel: 0.75,
  hr: 0.75,
  hr_p: 0.75,
  hr_pp: 0.6,
  triple: 0.4,
  hr_ppp: 0.4,
};
const MASS: [number, number, number][] = [
  [0, 1950, 180.0],
  [1950, 1995, 360.0],
  [1995, 9999, 450.0],
];
const DOOR_U: [number, number, number][] = [
  [0, 2005, 1.4925],
  [2005, 9999, 2.993],
];

// RVO reference dwellings 2022 for nta8800/mwa: window fraction, door area [m²], window U
const RVO: Record<string, [number, number, number]> = {
  "twee_onder_een_kap tot65": [0.1958, 6.86, 1.8],
  "twee_onder_een_kap 75-91": [0.1939, 6.51, 2.9],
  "twee_onder_een_kap 92-05": [0.198, 6.93, 2.9],
  "twee_onder_een_kap 06-14": [0.1932, 8.36, 1.8],
  "hoekwoning tot46": [0.1842, 7.73, 2.9],
  "hoekwoning 75-91": [0.1679, 4.57, 2.9],
  "tussenwoning tot46": [0.2872, 6.32, 2.9],
  "tussenwoning 75-91": [0.2999, 4.55, 2.9],
  "tussenwoning 92-05": [0.3007, 5.65, 1.8],
  "vrijstaand tot65": [0.1693, 8.04, 1.8],
  "vrijstaand 75-91": [0.1894, 8.0, 2.9],
  "vrijstaand 92-05": [0.2141, 10.09, 2.9],
  "vrijstaand 06-14": [0.1867, 11.52, 1.8],
};
const PERIODS = ["tot46", "tot65", "75-91", "92-05", "06-14"];
const PERIOD_START: Record<string, number> = { tot46: 0, tot65: 1946, "75-91": 1975, "92-05": 1992, "06-14": 2006 };
const VARIANTS = ["oorspronkelijk", "huidig", "besparingspakket_1", "besparingspakket_3"];
const HOOFDVORM: Record<DwellingType, string> = {
  vrijstaand: "vrijstaande woning",
  twee_onder_een_kap: "2-onder-1-kap",
  hoekwoning: "rijwoning hoek",
  tussenwoning: "rijwoning tussen",
};
const TYPES = Object.keys(HOOFDVORM) as DwellingType[];
const MID_TERRACE_SHARE = 0.44;

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const lookup = (year: number, table: number[][], col: number) => {
  for (const row of table) if (year >= row[0] && year < row[1]) return row[col];
  return NaN;
};

function period(year: number) {
  if (year < 1946) return "tot46";
  if (year < 1975) return "tot65";
  if (year < 1992) return "75-91";
  if (year < 2006) return "92-05";
  return "06-14";
}

function rvo(type: DwellingType, year: number): [number, number, number] {
  const p = period(year);
  const own = RVO[`${type} ${p}`];
  if (own) return own;
  const options = PERIODS.filter(q => RVO[`${type} ${q}`]);
  if (!options.length) return [0.2, 7.0, 2.9];
  const nearest = options.reduce((a, b) =>
    Math.abs(PERIOD_START[b] - PERIOD_START[p]) < Math.abs(PERIOD_START[a] - PERIOD_START[p]) ? b : a
  );
  return RVO[`${type} ${nearest}`];
}

function refClass(type: DwellingType, year: number) {
  const row = type === "hoekwoning" || type === "tussenwoning";
  if (year < (row ? 1946 : 1965)) return row ? "< 1946" : "< 1965";
  const classes: [number, number, string][] = [
    [1946, 1965, "1946–1964"],
    [1965, 1975, "1965–1974"],
    [1975, 1992, "1975–1991"],
    [1992, 2006, "1992–2005"],
    [2006, 2015, "2006–2014"],
  ];
  for (const [lo, hi, label] of classes) if (year >= lo && year < hi) return label;
  return "2015–2018";
}

/** Single-family type from 3DBAG shape when no registered type exists (AnonyMate, without neighbours). */
export function inferDwellingType(
  attached: boolean | null | undefined,
  partyWall: number,
  outerWall: number
): DwellingType | null {
  if (!Number.isFinite(partyWall) || !Number.isFinite(outerWall)) return null;
  if (attached === false) return "vrijstaand";
  const share = partyWall / (partyWall + outerWall || NaN);
  return share < MID_TERRACE_SHARE ? "twee_onder_een_kap" : "tussenwoning";
}

function levelFromHeatDemand(q: number[], w: number) {
  if (w >= q[0]) return 0;
  if (w <= q[q.length - 1]) return q.length - 1;
  for (let i = 0; i < q.length - 1; i++) {
    const hi = q[i];
    const lo = q[i + 1];
    if (lo <= w && w <= hi) return i + (hi === lo ? 0 : (hi - w) / (hi - lo));
  }
  return 1;
}

function interp(values: (number | null | undefined)[], t: number) {
  const vals = values.map(v => (v === null || v === undefined ? NaN : v));
  let i = Math.floor(t);
  if (i >= vals.length - 1) return vals[vals.length - 1];
  i = Math.min(i, vals.length - 2);
  const f = t - i;
  return vals[i] * (1 - f) + vals[i + 1] * f;
}

function refArrays(ref: ReferenceData["woningen"][number]) {
  const parts = ref.bouwdelen;
  const areas: Record<string, number> = {};
  for (const k of Object.keys(parts)) areas[k] = parts[k].oppervlak__m2;
  const aLs = Object.values(areas).reduce((a, b) => a + b, 0);
  const U: Record<string, (number | null)[]> = {};
  for (const k of Object.keys(parts)) U[k] = VARIANTS.map(v => parts[k].u__W_m_2_K_1[v] ?? null);
  const shares: Record<string, number> = {};
  for (const k of Object.keys(areas)) shares[k] = areas[k] / aLs;
  return {
    U,
    g: VARIANTS.map(v => GGL_BY_TYPE[parts.raam.glastype?.[v] ?? ""] ?? 0.75),
    q: VARIANTS.map(v => ref.warmtebehoefte_qhnd__kWh_m_2[v]),
    bFloor: parts.vloer?.b_factor__0 ?? 1.0,
    windowFrac: areas.raam / (areas.gevel + areas.raam + (areas.deur ?? 0)),
    door: areas.deur ?? 0,
    compactness: aLs / ref.gebruiksoppervlak__m2,
    shares,
  };
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** The signature with one method, or null when the home is not single-family or data is missing. */
export function computeSignature(
  input: DwellingInput,
  method: Method,
  refs: ReferenceData
): Signature | null {
  if (method === "passend") {
    const ep = computeSignature(input, "ep", refs);
    const out = ep ?? computeSignature(input, "best", refs);
    return out ? { ...out, method: "passend" } : null;
  }
  const year = num(input.bouwjaar__yr);
  let gbo = num(input.oppervlakte__m2);
  const outer = num(input.opp_buitenmuur__m2);
  const groundArea = num(input.opp_grond__m2);
  const roofFlat = num(input.opp_dak_plat__m2);
  const roofPitched = num(input.opp_dak_schuin__m2);
  const party = num(input.opp_scheidingsmuur__m2);
  const single = num(input.pand_woningen__0) === 1;

  const registered = TYPES.includes(input.woningtype__cat as DwellingType)
    ? (input.woningtype__cat as DwellingType)
    : null;
  const type = registered ?? inferDwellingType(input.aaneengebouwd__bool, party, outer);
  if (!type || !Number.isFinite(year)) return null;

  const u: Record<string, number> = { gevel: NaN, raam: NaN, deur: NaN, vloer: NaN, dak: NaN };
  let frac = NaN;
  let door = NaN;
  let g = NaN;
  let bFloor = NaN;
  let level = NaN;
  let shares: Record<string, number> = { gevel: 0, raam: 0, deur: 0, vloer: 0, dak: 0 };

  if (method === "nta8800" || method === "mwa") {
    [frac, door, u.raam] = rvo(type, PERIOD_START[period(year)]);
    u.gevel = 1 / (lookup(year, RC, 2) + R_SI.wall + R_SE);
    u.vloer = 1 / (lookup(year, RC, 3) + R_SI.floor);
    u.dak = 1 / (lookup(year, RC, 4) + R_SI.roof + R_SE);
    u.deur = lookup(year, DOOR_U, 2);
    g = lookup(year, GGL, 2);
    bFloor = GROUND_FACTOR__0;
    level = 0;
  } else {
    const ref = refs.woningen.find(w => w.hoofdvorm === HOOFDVORM[type] && w.bouwjaarklasse === refClass(type, year));
    if (!ref) return null;
    const r = refArrays(ref);
    const label = input.energielabel__cat;
    const heat = num(input.warmtebehoefte__kWh_m_2_a_1);
    const compact = num(input.compactheid__m2_m_2);
    const fromHeat = !!input.nta8800__bool && heat > 0;
    const hasLabel = typeof label === "string" && label.length > 0 && !fromHeat;
    const byClass = typeof label !== "string" ? 1.0 : label.startsWith("A+") ? 2.0 : label === "A" || label === "B" ? 1.5 : 1.0;
    level = hasLabel ? byClass : 1.0;
    if (fromHeat) {
      const w = compact > 0 ? heat * (r.compactness / compact) : heat;
      level = levelFromHeatDemand(r.q, w);
    }
    for (const k of Object.keys(u)) if (r.U[k]) u[k] = interp(r.U[k], level);
    g = interp(r.g, level);
    frac = r.windowFrac;
    door = r.door;
    bFloor = r.bFloor;
    shares = { ...shares, ...r.shares };
  }

  if (method !== "nta8800") {
    for (const k of ["gevel", "vloer", "dak"]) u[k] = 1 / (1 / u[k] + MWA_RC_SURCHARGE);
    u.raam *= MWA_U_WINDOW_DOOR;
    u.deur *= MWA_U_WINDOW_DOOR;
    bFloor *= MWA_B_UNHEATED;
  }

  const labelArea = num(input.label_oppervlakte__m2);
  const aG = Number.isFinite(labelArea) ? labelArea : gbo;
  let windows: number;
  let walls: number;
  let ground: number;
  let roof: number;
  if (method === "ep") {
    const aLs = num(input.compactheid__m2_m_2) * aG;
    windows = aLs * shares.raam;
    walls = aLs * shares.gevel;
    door = aLs * shares.deur;
    ground = aLs * shares.vloer * bFloor;
    roof = aLs * shares.dak;
    gbo = aG;
  } else {
    windows = outer * frac;
    walls = outer - windows - door;
    ground = groundArea * bFloor;
    roof = roofFlat + roofPitched;
    if (method === "ep_3dbag") {
      const aLs = num(input.compactheid__m2_m_2) * aG;
      const scale = aLs / (outer + groundArea + roof);
      windows *= scale;
      walls *= scale;
      ground *= scale;
      roof *= scale;
      door *= scale;
      gbo = aG;
    }
  }

  const H = walls * u.gevel + windows * u.raam + door * u.deur + ground * u.vloer + roof * u.dak;
  const C = ((lookup(year, MASS, 2) * 1000) / 3600) * gbo;
  const opaque = ALPHA_SOL__0 * R_SE;
  const r = VERTICAL_IRRADIANCE_RATIO__W0;
  const Asol =
    windows * GLASS_SHARE__0 * g * F_W__0 * F_SH__0 * r +
    walls * opaque * u.gevel * r +
    door * opaque * u.deur * r +
    roof * opaque * u.dak;

  // infiltration: NTA 8800 forfaitary qv10, effective leakage area, LBL linearisation
  const flat = input.daktype__cat === "plat" || input.daktype__cat === "plat_meerdere";
  const maatwerk = method !== "nta8800";
  let qv10 = F_TYPE[type] * lookup(year, F_Y, 2) * (flat ? Q_SPEC_FLAT : Q_SPEC_PITCHED);
  if (maatwerk) qv10 *= MWA_INFILTRATION;
  const ela = ((qv10 * gbo * (ELA_DP__Pa / 10) ** FLOW_EXPONENT) / 1000 / Math.sqrt((2 * ELA_DP__Pa) / AIR_DENSITY)) * 1e4;
  const storeys = num(input.bouwlagen__0);
  const cls = Number.isFinite(storeys) ? Math.min(3, Math.max(1, Math.round(storeys))) : 2;
  let Ainf = ela * LBL_K[cls];
  if (!Number.isFinite(Ainf)) Ainf = A_INF_NL_AVG__cm2 * (maatwerk ? MWA_INFILTRATION : 1);

  const ok = single && Number.isFinite(H) && H > 0 && Number.isFinite(C) && walls > 0;
  if (!ok) return null;
  return {
    H__W_K_1: round(H, 2),
    C__Wh_K_1: round(C, 1),
    tau__h: round(C / H, 3),
    Asol__m2: round(Asol, 3),
    Ainf__cm2: round(Ainf, 1),
    method,
    methode_gebruikt__cat: method,
    woningtype_gebruikt__cat: type,
    isolatieniveau__0: round(level, 3),
  };
}

/** EP-online label -> class like "A++" or "C"; null when unknown (AnonyMate normalise_label). */
export function normaliseLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = String(s).replace(/\s+/g, "").toUpperCase().replace(/^LABEL/, "");
  return /^(A\+{0,5}|[B-G])$/.test(t) ? t : null;
}

/** EP-online / free text -> dwelling type (AnonyMate normalise_dwelling_type); "appartement" -> null. */
export function normaliseDwellingType(s: string | null | undefined): DwellingType | null {
  if (!s) return null;
  const t = String(s).trim().toLowerCase();
  if ((TYPES as string[]).includes(t)) return t as DwellingType;
  const patterns: [RegExp, DwellingType | null][] = [
    [/\/\s*rijwoning hoek\s+rijwoning/, "hoekwoning"],
    [/2.?onder.?1|twee.?onder.?([eé]{2}n|1)|semi.?detached|2\/1/, "twee_onder_een_kap"],
    [/vrijstaand|detached|free.?standing/, "vrijstaand"],
    [/appartement|apartment|flat|galerij|portiek|maisonnette|etage|bovenwoning|benedenwoning|meergezins|multi.?family/, null],
    [/hoek|end.?of.?terrace|corner/, "hoekwoning"],
    [/tussen|rij|mid.?terrace|terraced|row/, "tussenwoning"],
  ];
  for (const [re, canon] of patterns) if (re.test(t)) return canon;
  return null;
}

