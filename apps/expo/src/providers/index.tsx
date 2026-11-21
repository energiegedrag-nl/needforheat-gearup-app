import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider } from "@rneui/themed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NotificationProvider from "./NotificationProvider";
import UserProvider from "./UserProvider";

import { persistQueryCache, restoreQueryCache, wireFocusAndOnline } from "@/lib/queryCache";
import { STALE_TIME_MS } from "@/lib/queryCache/policy";
import { theme } from "@/lib/theme";

type ProviderProps = {
  children: ReactNode;
};

// Stale-while-revalidate: data on screen stays visible while newer data is fetched; data older than a minute is
// refreshed when a screen shows it, when the app comes back to the foreground and when the network returns.
// Screens show that a refresh is running (RefreshStatus and the pull-down indicator).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      cacheTime: 24 * 60 * 60 * 1000, // keep data in memory for the session, so it can be shown again at once
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});
wireFocusAndOnline();

export default function Providers(props: ProviderProps) {
  // Show the last known data at once: restore the saved cache before the screens mount (a small local file).
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    restoreQueryCache(queryClient).finally(() => {
      unsubscribe = persistQueryCache(queryClient);
      setRestored(true);
    });
    return () => unsubscribe?.();
  }, []);
  if (!restored) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <NotificationProvider>
              <NavigationContainer>
                <BottomSheetModalProvider>
                  <UserProvider>{props.children}</UserProvider>
                </BottomSheetModalProvider>
              </NavigationContainer>
            </NotificationProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
