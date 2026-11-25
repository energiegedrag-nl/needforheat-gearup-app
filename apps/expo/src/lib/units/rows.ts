/**
 * The rows of the screen with uploaded data: the latest value per property, a few derived values,
 * in a fixed order. No imports: pure functions with unit tests.
 */

export type Row = { property: { name: string }; value: string; time: number };

const H = "heat_tr_building_cond__W_K_1";
const C = "th_mass_building__Wh_K_1";
/** Thermal inertia τ = C/H [h]: uploaded with the heat signature since 25-11-2026; derived for older answers. */
export const TAU = "thermal_inertia__h";

/** Known properties first, in this order; the rest after them, by name. */
export const ORDER = [H, C, TAU, "aperture_sol__m2", "aperture_inf__cm2"];

/** The latest value per property. */
export function latestPerProperty<T extends Row>(measurements: T[]): T[] {
  const latest = new Map<string, T>();
  for (const m of measurements) {
    const seen = latest.get(m.property.name);
    if (!seen || m.time > seen.time) latest.set(m.property.name, m);
  }
  return [...latest.values()];
}

/** Derived rows: τ = C/H in whole hours, when the server has no τ, both are there and H > 0. */
export function derivedRows(rows: Row[]): Row[] {
  if (rows.some(r => r.property.name === TAU)) return [];
  const h = rows.find(r => r.property.name === H);
  const c = rows.find(r => r.property.name === C);
  if (!h || !c) return [];
  const hValue = Number(h.value);
  const cValue = Number(c.value);
  if (!(hValue > 0) || !Number.isFinite(cValue)) return [];
  return [{ property: { name: TAU }, value: (cValue / hValue).toFixed(0), time: Math.max(h.time, c.time) }];
}

/** Rows in screen order: those in ORDER first, then the rest by name. */
export function sortRows<T extends Row>(rows: T[]): T[] {
  const rank = (name: string) => {
    const i = ORDER.indexOf(name);
    return i < 0 ? ORDER.length : i;
  };
  return rows
    .slice()
    .sort((a, b) => rank(a.property.name) - rank(b.property.name) || a.property.name.localeCompare(b.property.name));
}

/** Latest per property, plus derived values, in screen order. */
export function screenRows(measurements: Row[]): Row[] {
  const latest = latestPerProperty(measurements);
  return sortRows([...latest, ...derivedRows(latest)]);
}
