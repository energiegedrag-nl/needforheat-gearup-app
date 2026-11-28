import { describe, expect, it } from "@jest/globals";

import { originOf, resolveUrl, withManualTheme } from "./manualLinks";

const PAGE = "https://manuals.example.org/devices/module/installation/manufacturer/nl-NL/";

describe("manual links", () => {
  it("sets the theme parameter, replacing an earlier one and keeping the rest", () => {
    expect(withManualTheme("https://m.org/faq/nl-NL/", "dark")).toBe("https://m.org/faq/nl-NL/?theme=dark");
    expect(withManualTheme("https://m.org/faq/?a=1&theme=light#q2", "system")).toBe(
      "https://m.org/faq/?a=1&theme=system#q2"
    );
  });

  it("resolves relative links against the page", () => {
    expect(resolveUrl("../../../faq/", PAGE)).toBe("https://manuals.example.org/devices/module/faq/");
    expect(resolveUrl("./privacy/", PAGE)).toBe(`${PAGE}privacy/`);
    expect(resolveUrl("/campaigns/generic/faq/", PAGE)).toBe("https://manuals.example.org/campaigns/generic/faq/");
    expect(resolveUrl("../../../../../../../x/", PAGE)).toBe("https://manuals.example.org/x/");
    expect(resolveUrl("#stap-2", `${PAGE}?theme=dark`)).toBe(`${PAGE}?theme=dark#stap-2`);
    expect(resolveUrl("..", "https://m.org/a/b/c")).toBe("https://m.org/a/");
  });

  it("leaves absolute links alone", () => {
    expect(resolveUrl("https://other.org/a", PAGE)).toBe("https://other.org/a");
    expect(resolveUrl("mailto:help@example.org", PAGE)).toBe("mailto:help@example.org");
    expect(resolveUrl("//cdn.org/x", PAGE)).toBe("https://cdn.org/x");
  });

  it("compares origins", () => {
    expect(originOf(PAGE)).toBe("https://manuals.example.org");
    expect(originOf("HTTPS://Manuals.example.org:443/x")).toBe("https://manuals.example.org:443");
    expect(originOf("mailto:x@y")).toBe("");
  });
});
