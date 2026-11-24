import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, makeStyles, useTheme } from "@rneui/themed";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import Box from "@/components/elements/Box";
import useEnergyQuery from "@/hooks/energyquery/useEnergyQuery";
import useTranslation from "@/hooks/translation/useTranslation";
import useMeasurements from "@/hooks/upload/useMeasurements";
import { formatValue, splitPropertyName } from "@/lib/units/units";
import { Measurement } from "@/types/api";
import { HomeStackParamList } from "@/types/navigation";
import { readableDateTime, toLocalDateTime } from "@/utils/tools";

type EnergyQueryUploadedScreenProps = NativeStackScreenProps<HomeStackParamList, "EnergyQueryUploadedScreen">;

/** The latest value per property, sorted by property name. */
function latestPerProperty(measurements: Measurement[]) {
  const latest = new Map<string, Measurement>();
  for (const m of measurements) {
    const seen = latest.get(m.property.name);
    if (!seen || m.time > seen.time) latest.set(m.property.name, m);
  }
  return [...latest.values()].sort((a, b) => a.property.name.localeCompare(b.property.name));
}

/**
 * What an energy query sent to the server, and when: per property the name, the value as the server
 * holds it (after rounding in the app) and the unit, read back from the server.
 */
export default function EnergyQueryUploadedScreen({ navigation, route }: EnergyQueryUploadedScreenProps) {
  const { queryType } = route.params;
  const { data: query } = useEnergyQuery(queryType);
  const { data: measurements, isLoading } = useMeasurements(queryType, "energy_query", {});
  const { theme } = useTheme();
  const { t, resolvedLanguage } = useTranslation();
  const style = useStyles();
  const locale = resolvedLanguage === "nl-NL" ? "nl-NL" : "en-US";
  const words = {
    yes: t("screens.home_stack.energy_query.uploaded_screen.yes") as string,
    no: t("screens.home_stack.energy_query.uploaded_screen.no") as string,
  };

  const rows = useMemo(() => latestPerProperty(measurements ?? []), [measurements]);
  const sentAt = query?.activated_at ?? (rows.length ? Math.max(...rows.map(m => m.time)) : undefined);

  return (
    <Box padded style={{ flex: 1 }}>
      <Text style={style.subtitle}>
        {`${t("screens.home_stack.energy_query.uploaded_screen.subtitle")}\n${readableDateTime(
          toLocalDateTime(sentAt),
          locale
        )}`}
      </Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: theme.spacing.lg }} />
      ) : rows.length === 0 ? (
        <Text style={style.empty}>{t("screens.home_stack.energy_query.uploaded_screen.empty")}</Text>
      ) : (
        <ScrollView style={style.list}>
          {rows.map(m => {
            const { name, suffix } = splitPropertyName(m.property.name);
            return (
              <View key={m.property.name} style={style.row} testID="uploaded-property">
                <Text style={style.name}>{name}</Text>
                <Text style={style.value}>{formatValue(m.value, suffix, locale, words)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
      <Box style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
        <Button
          containerStyle={{ flex: 1 }}
          title={t("screens.home_stack.energy_query.uploaded_screen.back_button") as string}
          color="grey2"
          onPress={() => navigation.navigate("HomeScreen")}
          icon={{ name: "arrow-back-circle-outline", type: "ionicon", color: theme.colors.white }}
        />
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  subtitle: {
    fontWeight: "bold",
    textAlign: "center",
    alignSelf: "center",
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
  empty: {
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
  },
  name: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  value: {
    fontWeight: "bold",
    textAlign: "right",
  },
}));
