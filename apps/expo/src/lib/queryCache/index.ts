/**
 * Query cache on the phone between app starts (policy.ts says what and how long), and the wiring that makes React
 * Query refresh stale data when the app comes back to the foreground or the network returns.
 *
 * The file lives in the app's own document directory (expo-file-system); it is not encrypted, but holds no keys or
 * tokens (see policy.ts).
 */
import NetInfo from "@react-native-community/netinfo";
import { dehydrate, focusManager, hydrate, onlineManager, QueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { AppState, Platform } from "react-native";

import { isUsableQueryCache, QUERY_CACHE_VERSION, shouldPersistQuery } from "./policy";

const FILE = `${FileSystem.documentDirectory ?? ""}query-cache.json`;
const SAVE_DELAY_MS = 2000;

/** Put the last saved data back into the client, if usable. Never throws. */
export async function restoreQueryCache(client: QueryClient): Promise<void> {
  try {
    const text = await FileSystem.readAsStringAsync(FILE);
    const saved = JSON.parse(text);
    if (isUsableQueryCache(saved, Date.now())) hydrate(client, saved.state);
  } catch {
    // no cache yet, or unreadable: start empty
  }
}

/** Save the kept queries shortly after they change; returns the unsubscribe function. */
export function persistQueryCache(client: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = async () => {
    try {
      const state = dehydrate(client, {
        shouldDehydrateQuery: query => shouldPersistQuery(query.queryKey, query.state.status),
      });
      await FileSystem.writeAsStringAsync(
        FILE,
        JSON.stringify({ version: QUERY_CACHE_VERSION, savedAt: Date.now(), state })
      );
    } catch {
      // not saved: next start fetches as before
    }
  };
  const unsubscribe = client.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

/** Forget the saved data (e.g. when another account is activated). */
export async function clearQueryCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(FILE, { idempotent: true });
  } catch {
    // nothing to remove
  }
}

let wired = false;

/**
 * React Query does not know about app state and network in React Native: tell it, so that stale data is refreshed
 * when the app comes back to the foreground (after switching apps) and when the network returns.
 */
export function wireFocusAndOnline(): void {
  if (wired) return;
  wired = true;
  if (Platform.OS !== "web") {
    focusManager.setEventListener(handleFocus => {
      const subscription = AppState.addEventListener("change", state => handleFocus(state === "active"));
      return () => subscription.remove();
    });
  }
  onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => setOnline(state.isConnected !== false))
  );
}
