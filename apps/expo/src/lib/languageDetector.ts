import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { LanguageDetectorAsyncModule } from "i18next";

export const STORE_LANGUAGE_KEY = "app_language";

export const SUPPORTED_LANGUAGES = ["nl-NL", "en-US"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// The phone reports a bare language code ("nl", "en") or another region ("en-GB"), but the app and the
// manual server only know "nl-NL" and "en-US". Map every Dutch locale to nl-NL and everything else to en-US,
// so resolvedLanguage is always one of the two.
export function toSupportedLanguage(language: string | null | undefined): SupportedLanguage {
  return language?.toLowerCase().startsWith("nl") ? "nl-NL" : "en-US";
}

export const LanguageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  detect: (callback: (language: string) => void) => {
    SecureStore.getItemAsync(STORE_LANGUAGE_KEY)
      .then(language => {
        if (language) {
          callback(toSupportedLanguage(language));
        } else {
          const [locale] = Localization.getLocales();
          callback(toSupportedLanguage(locale?.languageCode));
        }
      })
      .catch(error => {
        console.log("Error reading language", error);
        callback(toSupportedLanguage(Localization.getLocales()[0]?.languageCode));
      });
  },
  init: async () => null,
  async: true,
};
