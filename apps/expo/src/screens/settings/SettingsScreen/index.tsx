import { API_URL, BUILD_COMMIT } from "@env";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { makeStyles, Text } from "@rneui/themed";
import { toast } from "burnt";
import { nativeBuildVersion } from "expo-application";
import Constants from "expo-constants";
import { useRef } from "react";
import { Alert, FlatList, Linking } from "react-native";

import LanguageBottomSheet from "./_languageBottomSheet";
import SettingListItem, { SettingItem } from "./_settingListItem";

import Box from "@/components/elements/Box";
import { deleteWifiNetworks } from "@/constants";
import useTranslation from "@/hooks/translation/useTranslation";
export default function SettingsScreen() {
  const styles = useStyles();
  const { t, languages, resolvedLanguage } = useTranslation();
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);

  const onDeleteWifiPasswords = () => {
    Alert.alert(
      t("screens.settings_stack.settings_screen.wifi_passwords.title"),
      t("screens.settings_stack.settings_screen.wifi_passwords.message") as string,
      [
        {
          text: t("common.cancel") as string,
          style: "cancel",
        },
        {
          text: t("common.delete") as string,
          style: "destructive",
          onPress: async () => {
            await deleteWifiNetworks();
            toast({
              title: t("screens.settings_stack.settings_screen.wifi_passwords.toast"),
              from: "bottom",
            });
          },
        },
      ]
    );
  };

  const onOpenNotificationSettings = () => {
    Linking.openSettings();
  };

  const data: SettingItem[] = [
    {
      title: t("screens.settings_stack.settings_screen.app_language"),
      value: languages[resolvedLanguage],
      onPress: () => {
        bottomSheetRef.current?.present();
      },
    },
    {
      title: t("screens.settings_stack.settings_screen.wifi_passwords.title"),
      value: "",
      onPress: onDeleteWifiPasswords,
    },
    {
      title: t("screens.settings_stack.settings_screen.notifications.title"),
      value: "",
      onPress: onOpenNotificationSettings,
    },
  ];

  return (
    <Box padded style={styles.container}>
      <FlatList data={data} renderItem={({ item }) => <SettingListItem item={item} />} />

      <Box fullWidth style={styles.centerContainer}>
        <Text>
          {t("screens.settings_stack.settings_screen.app_info", {
            version: Constants.expoConfig?.version ?? "N/A",
            build: nativeBuildVersion,
          })}
        </Text>
        <Text style={{ fontSize: 14 }}>API: {API_URL}</Text>
        {BUILD_COMMIT ? <Text style={{ fontSize: 14 }}>Build: {BUILD_COMMIT}</Text> : null}
      </Box>
      <LanguageBottomSheet bottomSheetRef={bottomSheetRef} />
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  centerContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
}));
