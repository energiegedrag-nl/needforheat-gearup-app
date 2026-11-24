/**
 * Units of property names as a person reads them. A property name ends in a physiquant__unit
 * suffix after its last "__" (e.g. `heat_tr_building_cond__W_K_1`); this file turns that suffix
 * into a unit (W/K) and an uploaded value into text in the local style.
 *
 * - Factors are separated by "_"; a positive exponent follows the factor: `m2` -> m², `dm3` -> dm³.
 * - A negative exponent is a number of its own after the factor: `W_K_1` -> W/K, `m_s_2` -> m/s²;
 *   several factors in the denominator go between brackets with a middle dot:
 *   `dm3_s_1_m_2` -> dm³/(s·m²).
 * - `degC` -> °C; exponent 0 (`__0`, `__W0`) is dimensionless; `__0` is shown as a percentage.
 * - `cat`, `str` and `tmz` are text, `bool` yes/no.
 *
 * No imports: pure functions, shared with the axes of the graphs.
 */

export type UnitKind = "number" | "percentage" | "dimensionless" | "text" | "bool";
export type Unit = { kind: UnitKind; symbol: string };

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};
const SYMBOLS: Record<string, string> = { degC: "°C", degF: "°F" };
const TEXT_SUFFIXES = ["cat", "str", "tmz"];

const superscript = (n: number) => (n === 1 ? "" : String(n).replace(/\d/g, d => SUPERSCRIPT[d]));

/** A property name split into its name and its unit suffix (empty when there is none). */
export function splitPropertyName(property: string): { name: string; suffix: string } {
  const at = property.lastIndexOf("__");
  if (at <= 0) return { name: property, suffix: "" };
  return { name: property.slice(0, at), suffix: property.slice(at + 2) };
}

/** The unit of a physiquant suffix: its kind and the symbol a person reads. */
export function parseUnit(suffix: string): Unit {
  if (!suffix) return { kind: "number", symbol: "" };
  if (TEXT_SUFFIXES.includes(suffix)) return { kind: "text", symbol: "" };
  if (suffix === "bool") return { kind: "bool", symbol: "" };
  if (suffix === "0") return { kind: "percentage", symbol: "%" };

  const factors: { base: string; exponent: number }[] = [];
  for (const token of suffix.split("_")) {
    if (/^\d+$/.test(token) && factors.length) {
      factors[factors.length - 1].exponent = -Number(token);
      continue;
    }
    const m = token.match(/^(.*?[^\d])(\d*)$/);
    if (!m) return { kind: "number", symbol: suffix };
    factors.push({ base: m[1], exponent: m[2] === "" ? 1 : Number(m[2]) });
  }
  if (factors.every(f => f.exponent === 0)) return { kind: "dimensionless", symbol: "" };

  const write = (f: { base: string; exponent: number }) => (SYMBOLS[f.base] ?? f.base) + superscript(Math.abs(f.exponent));
  const top = factors.filter(f => f.exponent > 0).map(write);
  const bottom = factors.filter(f => f.exponent < 0).map(write);
  let symbol = top.join("·");
  if (bottom.length) symbol = `${symbol || "1"}/${bottom.length > 1 ? `(${bottom.join("·")})` : bottom[0]}`;
  return { kind: "number", symbol };
}

/** A number as text in the local style, with the given number of decimals. */
export function formatNumber(value: number, decimals: number, locale: string): string {
  const dutch = locale.toLowerCase().startsWith("nl");
  const [whole, fraction] = Math.abs(value).toFixed(Math.max(0, decimals)).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, dutch ? "." : ",");
  const sign = value < 0 && Number(`${whole}.${fraction ?? 0}`) !== 0 ? "-" : "";
  return sign + grouped + (fraction ? (dutch ? "," : ".") + fraction : "");
}

const decimalsOf = (text: string) => {
  const m = text.trim().match(/[.,](\d+)$/);
  return m ? m[1].length : 0;
};

/**
 * An uploaded value with its unit, as a person reads it. Numbers keep the digits they were
 * uploaded with (the value is already rounded), in the local style.
 */
export function formatValue(
  value: string,
  suffix: string,
  locale: string,
  words: { yes: string; no: string } = { yes: "yes", no: "no" }
): string {
  const unit = parseUnit(suffix);
  if (unit.kind === "text") return value;
  if (unit.kind === "bool") return ["true", "1"].includes(value.trim().toLowerCase()) ? words.yes : words.no;
  const x = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(x)) return value;
  if (unit.kind === "percentage") return `${formatNumber(x * 100, Math.max(0, decimalsOf(value) - 2), locale)}%`;
  const text = formatNumber(x, decimalsOf(value), locale);
  return unit.symbol ? `${text} ${unit.symbol}` : text;
}
