import { describe, expect, it } from "@jest/globals";

import { screenRows, TAU } from "./rows";

const m = (name: string, value: string, time = 100) => ({ property: { name }, value, time });

describe("rows of the uploaded-data screen", () => {
  it("adds τ = C/H and puts H, C, τ, A_sol, A_inf first, the rest by name", () => {
    const rows = screenRows([
      m("device_timezone__tmz", "Europe/Amsterdam"),
      m("aperture_inf__cm2", "40"),
      m("qv10__dm3_s_1_m_2", "0.5"),
      m("aperture_sol__m2", "11.5"),
      m("th_mass_building__Wh_K_1", "15000"),
      m("heat_tr_building_cond__W_K_1", "155"),
    ]);
    expect(rows.map(r => r.property.name)).toEqual([
      "heat_tr_building_cond__W_K_1",
      "th_mass_building__Wh_K_1",
      TAU,
      "aperture_sol__m2",
      "aperture_inf__cm2",
      "device_timezone__tmz",
      "qv10__dm3_s_1_m_2",
    ]);
    expect(rows[2].value).toBe("97"); // 15000 / 155 = 96.8 h
  });

  it("keeps the latest value per property", () => {
    const rows = screenRows([m("heat_tr_building_cond__W_K_1", "150", 1), m("heat_tr_building_cond__W_K_1", "155", 2)]);
    expect(rows).toEqual([m("heat_tr_building_cond__W_K_1", "155", 2)]);
  });

  it("adds no τ without both C and H, or with H zero", () => {
    expect(screenRows([m("th_mass_building__Wh_K_1", "15000")]).map(r => r.property.name)).not.toContain(TAU);
    const zero = screenRows([m("th_mass_building__Wh_K_1", "15000"), m("heat_tr_building_cond__W_K_1", "0")]);
    expect(zero.map(r => r.property.name)).not.toContain(TAU);
  });

  it("leaves device measurements in order of name", () => {
    expect(screenRows([m("temp_in__degC", "20.5"), m("co2__ppm", "800")]).map(r => r.property.name)).toEqual([
      "co2__ppm",
      "temp_in__degC",
    ]);
  });
});
