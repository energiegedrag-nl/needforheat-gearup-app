import { useEffect } from "react";
import * as Linking from "expo-linking";

type AppLinkCallback = (url: string) => void | Promise<void>;

/**
 * Calls onLink for the URL that opened the app (cold start) and for every URL opened while it runs.
 * Used for account activation links. Works for the custom scheme (nfh://...) and for verified
 * https links (Android App Links / iOS Universal Links) without any third-party service.
 * (useDeepLinks, used for OAuth redirects, deliberately ignores the initial URL.)
 */
export default function useAppLinks(onLink: AppLinkCallback) {
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => onLink(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        onLink(url);
      }
    })();
  }, []);
}
