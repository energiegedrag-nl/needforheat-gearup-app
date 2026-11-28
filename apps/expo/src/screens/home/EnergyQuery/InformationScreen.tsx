import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, useTheme } from "@rneui/themed";

import ManualContent from "@/components/common/ManualContent";
import Box from "@/components/elements/Box";
import useTranslation from "@/hooks/translation/useTranslation";
import { HomeStackParamList } from "@/types/navigation";
import { getManualUrl } from "@/utils/tools";

type InformationScreenProps = NativeStackScreenProps<HomeStackParamList, "InformationScreen">;

/** The explanation of an energy query, opened from the question mark on the question; back to the question. */
export default function InformationScreen({ navigation, route }: InformationScreenProps) {
  const { dataSource } = route.params;
  const { t, resolvedLanguage } = useTranslation();
  const { theme } = useTheme();

  return (
    <Box padded style={{ flex: 1 }}>
      <ManualContent manualUrl={getManualUrl(dataSource) + "/installation"} languageHeader={resolvedLanguage} />
      <Box style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
        <Button
          containerStyle={{ flex: 1 }}
          title={t("screens.home_stack.energy_query.information_screen.button") as string}
          color="primary"
          onPress={() => navigation.goBack()}
          icon={{ name: "checkmark-outline", type: "ionicon", color: theme.colors.onPrimary }}
        />
      </Box>
    </Box>
  );
}
