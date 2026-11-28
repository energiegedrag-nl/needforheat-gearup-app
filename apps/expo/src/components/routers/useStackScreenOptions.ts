import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useTheme } from "@rneui/themed";
import { useMemo } from "react";

/** One header for every stack: flat, on the screen's own background, the title in Roboto Bold. */
export default function useStackScreenOptions(): NativeStackNavigationOptions {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.background },
      headerShadowVisible: false,
      headerTintColor: theme.colors.tint,
      headerTitleStyle: { fontFamily: "RobotoBold", color: theme.colors.text },
      contentStyle: { backgroundColor: theme.colors.background },
    }),
    [theme]
  );
}
