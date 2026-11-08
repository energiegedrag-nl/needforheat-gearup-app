/**
 * Public data about one home, fetched directly from the phone (local first): the address never
 * goes to the NeedForHeat server.
 *
 * - PDOK Locatieserver and PDOK BAG OGC API (no key): verblijfsobject, usable area, building
 *   (pand), construction year, number of dwellings in the building.
 * - 3DBAG (no key): envelope areas, roof type, storeys.
 * - EP-online (optional, needs a key): registered energy label, type, compactness, heat demand.
 *   The key is personal; the server hands it out at run time and the app does not store it.
 */
import { DwellingInput, normaliseDwellingType, normaliseLabel } from "./signature";

const LOCATIESERVER = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";
const BAG_OGC = "https://api.pdok.nl/kadaster/bag/ogc/v2/collections";
const BAG3D = "https://api.3dbag.nl/collections/pand/items";
const EP_ONLINE = "https://public.ep-online.nl/api/v5/PandEnergielabel/AdresseerbaarObject";

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers } });
  if (!response.ok) throw new Error(`${new URL(url).host}: HTTP ${response.status}`);
  return response.json();
}

/** Address text (as formatted by utils/geocoding) -> BAG verblijfsobject id. */
export async function findVerblijfsobject(address: string): Promise<string | null> {
  const body = await getJson(
    `${LOCATIESERVER}?q=${encodeURIComponent(address)}&fq=type:adres&rows=1&fl=adresseerbaarobject_id`
  );
  return body?.response?.docs?.[0]?.adresseerbaarobject_id ?? null;
}

type BagData = { vboId: string; pandId: string | null; oppervlakte?: number; bouwjaar?: number; pandWoningen?: number };

export async function fetchBag(vboId: string): Promise<BagData> {
  const vbo = await getJson(`${BAG_OGC}/verblijfsobject/items?f=json&identificatie=${vboId}`);
  const props = vbo?.features?.[0]?.properties ?? {};
  // "pand.href" links to the building by its internal feature id (a UUID), not by the 16-digit BAG id,
  // so follow the link itself; the building's properties carry the BAG id ("identificatie").
  const pandHref: string | undefined = (props["pand.href"] ?? [])[0];
  let pand: Record<string, unknown> = {};
  if (pandHref) {
    const p = await getJson(`${pandHref}${pandHref.includes("?") ? "&" : "?"}f=json`);
    pand = p?.properties ?? p?.features?.[0]?.properties ?? {};
  }
  const pandId = typeof pand.identificatie === "string" ? pand.identificatie : null;
  return {
    vboId,
    pandId,
    oppervlakte: typeof props.oppervlakte === "number" ? props.oppervlakte : undefined,
    bouwjaar: typeof pand.bouwjaar === "number" ? pand.bouwjaar : undefined,
    pandWoningen: typeof pand.aantal_verblijfsobjecten === "number" ? pand.aantal_verblijfsobjecten : undefined,
  };
}

const ROOF: Record<string, string> = { horizontal: "plat", "multiple horizontal": "plat_meerdere", slanted: "schuin" };

export async function fetch3dBag(
  pandId: string
): Promise<{ input: Partial<DwellingInput>; attributes: Record<string, unknown> }> {
  const body = await getJson(`${BAG3D}/NL.IMBAG.Pand.${pandId}`);
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

/** Field names of EP-online vary (Pand_energieklasse / Energieklasse): compare them normalised. */
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^pand/, "");
const pick = (rec: Record<string, unknown>, ...names: string[]) => {
  for (const [k, v] of Object.entries(rec)) if (names.includes(norm(k))) return v;
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
  const vboId = await findVerblijfsobject(address);
  if (!vboId) throw new Error("address not found in the BAG");
  const bag = await fetchBag(vboId);
  if (!bag.pandId) throw new Error("no building (pand) for this address");
  const { input: shape, attributes } = await fetch3dBag(bag.pandId);
  let label: Partial<DwellingInput> = {};
  if (epOnlineKey) {
    try {
      label = await fetchEpOnline(vboId, epOnlineKey);
    } catch {
      label = {};
    }
  }
  const input: DwellingInput = {
    bouwjaar__yr: bag.bouwjaar ?? null,
    oppervlakte__m2: bag.oppervlakte ?? null,
    pand_woningen__0: bag.pandWoningen ?? null,
    ...shape,
    ...label,
  };
  return { vboId, pandId: bag.pandId, input, attributes, hasLabel: Object.keys(label).length > 0 };
}
