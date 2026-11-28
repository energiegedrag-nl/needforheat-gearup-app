import { useOpenExternalLink } from "./useOpenExternalLink";
import useTranslation from "./translation/useTranslation";

import { useAppearance } from "@/providers/AppearanceProvider";
import { manualPageUrl } from "@/utils/tools";

/**
 * Opens a page of the manual server (FAQ, info, privacy, a link in a manual) in the browser, in the app's language
 * and light or dark mode rather than the phone's.
 */
export default function useOpenManualPage() {
  const { openUrl } = useOpenExternalLink();
  const { resolvedLanguage } = useTranslation();
  const { preference } = useAppearance();

  return async (url: string) => {
    openUrl(await manualPageUrl(url, resolvedLanguage, preference), false);
  };
}
