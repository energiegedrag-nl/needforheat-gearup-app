import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "@rneui/themed";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeRouter from "./HomeRouter";
import InfoRouter from "./InfoRouter";
import SettingsRouter from "./SettingsRouter";

import useTranslation from "@/hooks/translation/useTranslation";
import useUser from "@/hooks/user/useUser";
import MeasurementsScreen from "@/screens/MeasurementsScreen";
import { RootStackParamList } from "@/types/navigation";
const Tab = createBottomTabNavigator<RootStackParamList>();

interface AppRouterProps {
  fontsLoaded: boolean;
}

export default function AppRouter({ fontsLoaded }: AppRouterProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isAuthed } = useUser();

  useEffect(() => {
    const checkSplash = async () => {
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    };

    checkSplash().catch(console.error);
  }, [fontsLoaded, isAuthed]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.grey3,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontFamily: "RobotoMedium", fontSize: 11 },
        // The measurements screen has its own header (no stack): the same flat look as the stacks.
        headerStyle: { backgroundColor: theme.colors.background, shadowOpacity: 0, elevation: 0 },
        headerTitleStyle: { fontFamily: "RobotoBold", color: theme.colors.text },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeRouter}
        options={{
          title: t("screens.home_stack.title") as string,
          tabBarIcon: ({ color, size, focused }) => {
            return <Ionicons name={focused ? "flash" : "flash-outline"} size={size} color={color} />;
          },
        }}
      />
      {isAuthed ? (
        <>
          <Tab.Screen
            name="Measurements"
            component={MeasurementsScreen}
            options={{
              title: t("screens.measurements.title") as string,
              headerShown: true,
              tabBarIcon: ({ color, size, focused }) => {
                return <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={size} color={color} />;
              },
            }}
          />
        </>
      ) : null}
      <Tab.Screen
        name="Info"
        component={InfoRouter}
        options={{
          title: t("screens.info_stack.title") as string,
          tabBarIcon: ({ color, size, focused }) => {
            return (
              <Ionicons
                name={focused ? "information-circle" : "information-circle-outline"}
                size={size}
                color={color}
              />
            );
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsRouter}
        options={{
          title: t("screens.settings_stack.title") as string,
          tabBarIcon: ({ color, size, focused }) => {
            return <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />;
          },
        }}
      />
    </Tab.Navigator>
  );
}
