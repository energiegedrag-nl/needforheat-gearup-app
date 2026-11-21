/**
 * Public data about one home, fetched directly from the phone (local first): the address never
 * goes to the NeedForHeat server, and no source gets the exact address or building in a request
 * ("fetch broad, choose locally"; docs/modelbijsluiter/warmteprestatiesignatuur.md, §B4):
 *
 * - PDOK BAG OGC API (no key):
 *   1. the verblijfsobjecten of the **postcode** (PC6, typically 10-25 addresses), with address,
 *      usable area, use and location; the dwelling is chosen locally from the address text;
 *   2. all buildings (panden) in a **300 m tile** on a fixed 200 m grid around it (not centred on
 *      the home), with footprint, construction year, use and number of dwellings. From these
 *      footprints: the exposed façade per orientation and the neighbours (facades.ts).
 * - 3DBAG (no key): envelope areas, roof type, storeys of the building, asked for together with
 *   seven other residential buildings from the same tile, in random order (an anonymity set of 8).
 * - EP-online (optional, needs a key): registered energy label, type, compactness, heat demand.
 *   This one is asked per address (no other way); the key is personal, the server hands it out at
 *   run time and the app does not store it.
 * - Urban heat island: from a table per PC4 bundled with the app (uhi.ts); no request at all.
 */
import { Footprint, Neighbourhood } from "./facades";
import { DwellingInput, normaliseDwellingType, normaliseLabel } from "./signature";
import { uhiForPostcode } from "./uhi";

const BAG_OGC = "https://api.pdok.nl/kadaster/bag/ogc/v2/collections";
const BAG3D = "https://api.3dbag.nl/collections/pand/items";
const EP_ONLINE = "https://public.ep-online.nl/api/v5/PandEnergielabel/AdresseerbaarObject";
const RD = "http://www.opengis.net/def/crs/EPSG/0/28992";

/** Tile grid and margin [m]: the tile is grid-aligned, so it does not point at the home. */
const TILE__m = 200;
const TILE_MARGIN__m = 50;
/** 3DBAG: the building itself plus this many others from the tile. */
const DECOYS_3DBAG = 7;
const MAX_PAGES = 5;

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers } });
  if (!response.ok) throw new Error(`${new URL(url).host}: HTTP ${response.status}`);
  return response.json();
}

/** All features of an OGC API items query, following "next" links (at most MAX_PAGES pages). */
async function getAllFeatures(url: string): Promise<any[]> {
  const out: any[] = [];
  let next: string | undefined = url;
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const body: any = await getJson(next);
    out.push(...(body?.features ?? []));
    next = (body?.links ?? []).find((l: any) => l?.rel === "next")?.href;
  }
  return out;
}

/** "Straat 12A bis, 1234 AB Plaats, Nederland" (utils/geocoding formatAddress) -> postcode and street part. */
export function splitAddress(address: string): { postcode: string; street: string } | null {
  const m = address.match(/^(.*?),\s*(\d{4})\s?([A-Za-z]{2})\b/);
  return m ? { postcode: `${m[2]}${m[3].toUpperCase()}`, street: m[1].trim() } : null;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** The number part as in the address text: "12A", "12A bis", "12 bis". */
function numberPart(p: Record<string, any>) {
  const addition = p.toevoeging ? ` ${p.toevoeging}` : "";
  return `${p.huisnummer}${p.huisletter ?? ""}${addition}`;
}

/** Choose the verblijfsobject of the address among those of its postcode (locally). */
export function chooseVerblijfsobject(features: any[], street: string): any | null {
  const s = norm(street);
  const candidates = features.filter(f => {
    const n = norm(numberPart(f.properties ?? {}));
    return s === n || s.endsWith(` ${n}`);
  });
  // Prefer an exact match with the street name; else the longest number part ("12A bis" before "12A").
  const byName = candidates.filter(f => s === norm(`${f.properties.openbare_ruimte_naam} ${numberPart(f.properties)}`));
  const pool = byName.length ? byName : candidates;
  pool.sort((a, b) => numberPart(b.properties).length - numberPart(a.properties).length);
  return pool[0] ?? null;
}

/** The grid-aligned tile (with margin) around a point, as a bbox string in RD. */
export function tileAround(x: number, y: number): string {
  const x0 = Math.floor(x / TILE__m) * TILE__m - TILE_MARGIN__m;
  const y0 = Math.floor(y / TILE__m) * TILE__m - TILE_MARGIN__m;
  const size = TILE__m + 2 * TILE_MARGIN__m;
  return `${x0},${y0},${x0 + size},${y0 + size}`;
}

/** GeoJSON Polygon / MultiPolygon coordinates -> list of polygons (rings). */
function polygonsOf(geometry: any): number[][][][] {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

const isDwelling = (gebruiksdoel: unknown) =>
  (Array.isArray(gebruiksdoel) ? gebruiksdoel.join(",") : String(gebruiksdoel ?? "")).includes("woonfunctie");

const ROOF: Record<string, string> = { horizontal: "plat", "multiple horizontal": "plat_meerdere", slanted: "schuin" };

function shapeFrom3dBag(body: any): { input: Partial<DwellingInput>; attributes: Record<string, unknown> } {
  const objects = body?.feature?.CityObjects ?? {};
  const first = Object.values(objects).find((o: any) => o?.attributes?.b3_opp_buitenmuur !== undefined) as any;
  const a = first?.attributes ?? {};
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const input: Partial<DwellingInput> = {
    opp_buitenmuur__m2: n(a.b3_opp_buitenmuur),
    opp_grond__m2: n(a.b3_opp_grond),
    opp_dak_plat__m2: n(a.b3_opp_dak_plat),
    opp_dak_schuin__m2: n(a.b3_opp_dak_schuin),
    opp_scheidingsmuur__m2: n(a.b3_opp_scheidingsmuur),
    bouwlagen__0: n(a.b3_bouwlagen),
    daktype__cat: typeof a.b3_dak_type === "string" ? (ROOF[a.b3_dak_type] ?? a.b3_dak_type) : null,
    aaneengebouwd__bool: n(a.b3_opp_scheidingsmuur) === null ? null : (a.b3_opp_scheidingsmuur as number) > 0,
  };
  return { input, attributes: a };
}

/** 3DBAG of one building, asked for among others from the same tile (in random order). */
export async function fetch3dBagAmong(pandId: string, others: string[]) {
  const pool = others.filter(id => id !== pandId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const ids = [pandId, ...pool.slice(0, DECOYS_3DBAG)];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const bodies = await Promise.all(
    ids.map(id => getJson(`${BAG3D}/NL.IMBAG.Pand.${id}`).catch(err => (id === pandId ? Promise.reject(err) : null)))
  );
  return shapeFrom3dBag(bodies[ids.indexOf(pandId)]);
}

/** Field names of EP-online vary (Pand_energieklasse / Energieklasse): compare them normalised. */
const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^pand/, "");
const pick = (rec: Record<string, unknown>, ...names: string[]) => {
  for (const [k, v] of Object.entries(rec)) if (names.includes(normKey(k))) return v;
  return undefined;
};
const toNumber = (v: unknown) => {
  const x = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(x) ? x : null;
};

export async function fetchEpOnline(vboId: string, apiKey: string): Promise<Partial<DwellingInput>> {
  const body = await getJson(`${EP_ONLINE}/${vboId}`, { Authorization: apiKey });
  const labels: Record<string, unknown>[] = Array.isArray(body) ? body : body ? [body] : [];
  if (!labels.length) return {};
  // the most recent registration
  const rec = labels
    .slice()
    .sort((a, b) => String(pick(b, "registratiedatum") ?? "").localeCompare(String(pick(a, "registratiedatum") ?? "")))[0];
  const type = `${pick(rec, "gebouwtype") ?? ""} ${pick(rec, "gebouwsubtype") ?? ""}`;
  return {
    energielabel__cat: normaliseLabel(pick(rec, "energieklasse") as string),
    woningtype__cat: normaliseDwellingType(type),
    compactheid__m2_m_2: toNumber(pick(rec, "compactheid")),
    label_oppervlakte__m2: toNumber(pick(rec, "gebruiksoppervlaktethermischezone")),
    warmtebehoefte__kWh_m_2_a_1: toNumber(pick(rec, "warmtebehoefte")),
    nta8800__bool: String(pick(rec, "berekeningstype") ?? "").includes("NTA 8800"),
  };
}

/** Everything for one address; EP-online only when a key is given (errors there are not fatal). */
export async function fetchDwelling(address: string, epOnlineKey?: string | null) {
  const parts = splitAddress(address);
  if (!parts) throw new Error("address without a postcode");

  // 1. the verblijfsobjecten of the postcode; choose the home locally
  const vbos = await getAllFeatures(
    `${BAG_OGC}/verblijfsobject/items?f=json&postcode=${parts.postcode}&crs=${encodeURIComponent(RD)}&limit=1000`
  );
  const vbo = chooseVerblijfsobject(vbos, parts.street);
  if (!vbo) throw new Error("address not found in the BAG");
  const props = vbo.properties ?? {};
  const vboId: string = props.identificatie;
  const [x, y] = vbo.geometry?.coordinates ?? [];
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("no location for this address");
  // "pand.href" links to the building by its internal feature id (a UUID), not by the 16-digit BAG id
  const pandUuid = String((props["pand.href"] ?? [])[0] ?? "").split("/").pop()?.split("?")[0] ?? "";

  // 2. all buildings in the tile around it
  const panden = await getAllFeatures(
    `${BAG_OGC}/pand/items?f=json&bbox=${tileAround(x, y)}&bbox-crs=${encodeURIComponent(RD)}` +
      `&crs=${encodeURIComponent(RD)}&limit=1000`
  );
  const own = panden.find(p => p.id === pandUuid);
  if (!own) throw new Error("no building (pand) for this address");
  const pandId: string = own.properties.identificatie;
  const footprints: Footprint[] = panden.map(p => ({
    id: p.properties.identificatie,
    polygons: polygonsOf(p.geometry),
    dwelling: isDwelling(p.properties.gebruiksdoel),
  }));
  const hood = new Neighbourhood(footprints);
  const facades = hood.exposedPerSector(pandId);
  const { neighbours, block } = hood.neighboursAndBlock(pandId);

  // 3. 3DBAG, among seven other residential buildings of the tile
  const others = footprints.filter(f => f.dwelling && f.id !== pandId).map(f => f.id);
  const { input: shape, attributes } = await fetch3dBagAmong(pandId, others);

  let label: Partial<DwellingInput> = {};
  if (epOnlineKey) {
    try {
      label = await fetchEpOnline(vboId, epOnlineKey);
    } catch {
      label = {};
    }
  }
  const input: DwellingInput = {
    bouwjaar__yr: typeof own.properties.bouwjaar === "number" ? own.properties.bouwjaar : null,
    oppervlakte__m2: typeof props.oppervlakte === "number" ? props.oppervlakte : null,
    pand_woningen__0:
      typeof own.properties.aantal_verblijfsobjecten === "number" ? own.properties.aantal_verblijfsobjecten : null,
    gevel__m: facades?.total ?? null,
    gevelzij__m: facades?.side ?? null,
    buren__0: hood.has(pandId) ? neighbours : null,
    blok_panden__0: hood.has(pandId) ? block : null,
    ...shape,
    ...label,
  };
  return {
    vboId,
    pandId,
    input,
    attributes,
    hasLabel: Object.keys(label).length > 0,
    uhi__K: uhiForPostcode(parts.postcode),
  };
}
