import { createNativeStackNavigator } from "@react-navigation/native-stack";

import useStackScreenOptions from "./useStackScreenOptions";

import useTranslation from "@/hooks/translation/useTranslation";
import ExternalProviderScreen from "@/screens/settings/ExternalProviderScreen";
import SettingsScreen from "@/screens/settings/SettingsScreen";
import { SettingsStackParamList } from "@/types/navigation";

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

export default function InfoStackScreen() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();

  return (
    <SettingsStack.Navigator initialRouteName="SettingsScreen" screenOptions={screenOptions}>
      <SettingsStack.Screen
        name="SettingsScreen"
        options={{ title: t("screens.settings_stack.settings_screen.title") as string }}
        component={SettingsScreen}
      />
      <SettingsStack.Screen
        name="ExternalProviderScreen"
        options={{ title: t("screens.settings_stack.external_provider_screen.title") as string }}
        component={ExternalProviderScreen}
      />
    </SettingsStack.Navigator>
  );
}
