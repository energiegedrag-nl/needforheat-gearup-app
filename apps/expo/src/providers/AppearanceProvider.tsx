import { ThemeProvider, useThemeMode } from "@rneui/themed";
import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { ColorScheme, makeTheme } from "@/lib/theme";

/** What the user chose in the settings: follow the phone, or always light or dark. */
export type AppearancePreference = "system" | "light" | "dark";

export const APPEARANCE_PREFERENCES: AppearancePreference[] = ["system", "light", "dark"];
const STORE_APPEARANCE_KEY = "appearance";

type AppearanceContextProps = {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
  /** The scheme in use: the preference, or the phone's when following it. */
  scheme: ColorScheme;
};

export const AppearanceContext = createContext<AppearanceContextProps>({
  preference: "system",
  setPreference: () => undefined,
  scheme: "light",
});

export const useAppearance = () => useContext(AppearanceContext);

/** Keeps RNEUI's mode equal to the scheme in use (the theme prop alone does not switch an existing provider). */
function ModeSync({ scheme }: { scheme: ColorScheme }) {
  const { mode, setMode } = useThemeMode();
  useEffect(() => {
    if (mode !== scheme) setMode(scheme);
  }, [mode, scheme, setMode]);
  return null;
}

/** Light and dark: follows the phone unless the user chose otherwise in the settings (kept on the phone). */
export default function AppearanceProvider({ children }: PropsWithChildren<unknown>) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>("system");

  useEffect(() => {
    SecureStore.getItemAsync(STORE_APPEARANCE_KEY)
      .then(stored => {
        if (stored && (APPEARANCE_PREFERENCES as string[]).includes(stored)) {
          setPreferenceState(stored as AppearancePreference);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    SecureStore.setItemAsync(STORE_APPEARANCE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ColorScheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  const value = useMemo(() => ({ preference, setPreference, scheme }), [preference, setPreference, scheme]);

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <ModeSync scheme={scheme} />
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}
