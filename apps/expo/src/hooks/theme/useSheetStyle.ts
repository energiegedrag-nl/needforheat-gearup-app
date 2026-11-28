import { useTheme } from "@rneui/themed";
import { useMemo } from "react";

/** Bottom sheets on surface with rounded corners and a quiet handle, in light and dark (the library draws white). */
export default function useSheetStyle() {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      backgroundStyle: { backgroundColor: theme.colors.surface, borderRadius: 24 },
      handleIndicatorStyle: { backgroundColor: theme.colors.grey3, width: 40 },
    }),
    [theme]
  );
}
