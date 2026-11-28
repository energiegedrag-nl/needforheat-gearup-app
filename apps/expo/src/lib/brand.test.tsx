// brand.json is the one place for a deployment's brand (BRANDING.md). These checks catch a brand that is half
// applied (app.json not updated) or hard to read (too little contrast) before it reaches a phone.
import appJson from "../../app.json";
import brand from "../../brand.json";

type Palette = Record<string, string>;

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("brand.json", () => {
  it("uses #RRGGBB for every colour", () => {
    const colours = [brand.brand, brand.light, brand.dark].flatMap(p => Object.values(p as Palette));
    colours.forEach(c => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it("has the same tokens in light and dark", () => {
    expect(Object.keys(brand.dark).sort()).toEqual(Object.keys(brand.light).sort());
  });

  it("is applied to app.json (run assets/brand/apply_brand.py)", () => {
    const expo = appJson.expo as any;
    const backdrop = brand.brand.backdrop.toUpperCase();
    expect(expo.splash.backgroundColor.toUpperCase()).toBe(backdrop);
    expect(expo.android.adaptiveIcon.backgroundColor.toUpperCase()).toBe(backdrop);
    const notifications = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-notifications");
    expect(notifications[1].color.toUpperCase()).toBe(brand.brand.primary.toUpperCase());
  });

  (["light", "dark"] as const).forEach(mode => {
    it(`keeps text readable in ${mode} mode (WCAG 4.5:1)`, () => {
      const p = brand[mode] as Palette;
      const pairs: [string, string][] = [
        ["text", "background"],
        ["text", "surface"],
        ["textMuted", "background"],
        ["textMuted", "surface"],
        ["tint", "background"],
        ["tint", "surface"],
        ["onPrimary", "primary"],
      ];
      pairs.forEach(([fg, bg]) => {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(p[fg], p[bg]) >= 4.5 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      });
    });
  });
});
