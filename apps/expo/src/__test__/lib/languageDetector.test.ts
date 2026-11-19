import { toSupportedLanguage } from "@/lib/languageDetector";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "nl" }] }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn() }));

describe("toSupportedLanguage", () => {
  it.each([
    ["nl", "nl-NL"],
    ["nl-NL", "nl-NL"],
    ["nl-BE", "nl-NL"],
    ["NL", "nl-NL"],
    ["en", "en-US"],
    ["en-US", "en-US"],
    ["en-GB", "en-US"],
    ["de", "en-US"],
    [null, "en-US"],
    [undefined, "en-US"],
  ])("%s -> %s", (input, expected) => {
    expect(toSupportedLanguage(input)).toBe(expected);
  });
});
