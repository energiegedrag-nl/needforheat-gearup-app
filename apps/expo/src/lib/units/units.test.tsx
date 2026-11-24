import { describe, expect, it } from "@jest/globals";

import { formatNumber, formatValue, parseUnit, splitPropertyName } from "./units";

const symbol = (suffix: string) => parseUnit(suffix).symbol;

describe("units of property names", () => {
  it("splits the name from the unit after the last double underscore", () => {
    expect(splitPropertyName("heat_tr_building_cond__W_K_1")).toEqual({ name: "heat_tr_building_cond", suffix: "W_K_1" });
    expect(splitPropertyName("latitude")).toEqual({ name: "latitude", suffix: "" });
  });

  it("writes positive exponents as superscripts", () => {
    expect(symbol("m2")).toBe("m²");
    expect(symbol("dm3")).toBe("dm³");
    expect(symbol("cm2")).toBe("cm²");
    expect(symbol("K")).toBe("K");
  });

  it("puts negative exponents in a denominator", () => {
    expect(symbol("W_K_1")).toBe("W/K");
    expect(symbol("Wh_K_1")).toBe("Wh/K");
    expect(symbol("m_s_2")).toBe("m/s²");
    expect(symbol("dm3_s_1_m_2")).toBe("dm³/(s·m²)");
    expect(symbol("kWh_m_2_a_1")).toBe("kWh/(m²·a)");
    expect(symbol("s_1")).toBe("1/s");
  });

  it("knows degrees, fractions, ratios and text", () => {
    expect(symbol("degC")).toBe("°C");
    expect(parseUnit("ppm")).toEqual({ kind: "number", symbol: "ppm" });
    expect(parseUnit("0")).toEqual({ kind: "percentage", symbol: "%" });
    expect(parseUnit("W0").kind).toBe("dimensionless");
    expect(parseUnit("cat").kind).toBe("text");
    expect(parseUnit("str").kind).toBe("text");
    expect(parseUnit("tmz").kind).toBe("text");
    expect(parseUnit("bool").kind).toBe("bool");
  });
});

describe("uploaded values as a person reads them", () => {
  it("uses the local style and keeps the uploaded digits", () => {
    expect(formatValue("155", "W_K_1", "nl-NL")).toBe("155 W/K");
    expect(formatValue("15000", "Wh_K_1", "nl-NL")).toBe("15.000 Wh/K");
    expect(formatValue("15000", "Wh_K_1", "en-US")).toBe("15,000 Wh/K");
    expect(formatValue("11.5", "m2", "nl-NL")).toBe("11,5 m²");
    expect(formatValue("0.5", "dm3_s_1_m_2", "nl-NL")).toBe("0,5 dm³/(s·m²)");
    expect(formatValue("20.0", "degC", "en-US")).toBe("20.0 °C");
  });

  it("shows fractions as a percentage, text as is and booleans as words", () => {
    expect(formatValue("0.25", "0", "nl-NL")).toBe("25%");
    expect(formatValue("0.125", "0", "nl-NL")).toBe("12,5%");
    expect(formatValue("Europe/Amsterdam", "tmz", "nl-NL")).toBe("Europe/Amsterdam");
    expect(formatValue("tussenwoning", "cat", "nl-NL")).toBe("tussenwoning");
    expect(formatValue("true", "bool", "nl-NL", { yes: "ja", no: "nee" })).toBe("ja");
    expect(formatValue("0.95", "W0", "nl-NL")).toBe("0,95");
    expect(formatValue("n/a", "K", "nl-NL")).toBe("n/a");
  });

  it("formats negative numbers and large ones", () => {
    expect(formatNumber(-1234.5, 1, "nl-NL")).toBe("-1.234,5");
    expect(formatNumber(1234567, 0, "en-US")).toBe("1,234,567");
    expect(formatNumber(-0.001, 1, "en-US")).toBe("0.0");
  });
});
