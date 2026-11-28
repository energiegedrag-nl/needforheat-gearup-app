import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, makeStyles, useTheme, Text } from "@rneui/themed";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import Box from "@/components/elements/Box";
import useEnergyQuery from "@/hooks/energyquery/useEnergyQuery";
import usePropertyLabels from "@/hooks/propertylabels/usePropertyLabels";
import useTranslation from "@/hooks/translation/useTranslation";
import useMeasurements from "@/hooks/upload/useMeasurements";
import { screenRows, TAU } from "@/lib/units/rows";
import { formatValue, splitPropertyName } from "@/lib/units/units";
import { HomeStackParamList } from "@/types/navigation";
import { readableDateTime, toLocalDateTime } from "@/utils/tools";

type UploadedDataScreenProps = NativeStackScreenProps<HomeStackParamList, "UploadedDataScreen">;

/** For a device: look this far back for its latest measurements. */
const DEVICE_DAYS = 2;

/**
 * What the server holds of an energy query or a device, read back from the server: per property its
 * display name, the latest value as the server holds it (after rounding in the app) and the unit; for
 * an energy query when it was sent, for a device when the latest measurement was taken. Derived values
 * (τ = C/H) and the order come from lib/units/rows.
 */
/** Names for properties the server may have no label for (older servers, or no seed). */
const FALLBACK_LABELS: Record<string, string> = {
  [TAU]: "screens.home_stack.uploaded_screen.thermal_inertia",
  device_timezone__tmz: "screens.home_stack.uploaded_screen.time_zone",
};

export default function UploadedDataScreen({ navigation, route }: UploadedDataScreenProps) {
  const { source, name } = route.params;
  const isDevice = source === "device";
  const [options] = useState(() =>
    isDevice ? { start: dayjs().subtract(DEVICE_DAYS, "d").format("YYYY-MM-DD HH:mm:ss.SSS") } : {}
  );
  const { data: query } = useEnergyQuery(isDevice ? "" : name);
  const { data: measurements, isLoading } = useMeasurements(name, source, options);
  const { theme } = useTheme();
  const { t, resolvedLanguage } = useTranslation();
  const style = useStyles();
  const locale = resolvedLanguage === "nl-NL" ? "nl-NL" : "en-US";
  const { data: labels } = usePropertyLabels(locale);
  const words = {
    yes: t("screens.home_stack.uploaded_screen.yes") as string,
    no: t("screens.home_stack.uploaded_screen.no") as string,
  };

  const rows = useMemo(() => screenRows(measurements ?? []), [measurements]);
  const latest = rows.length ? Math.max(...rows.map(m => m.time)) : undefined;
  const when = isDevice ? latest : query?.activated_at ?? latest;
  const subtitle = isDevice ? "subtitle_device" : "subtitle_energy_query";

  return (
    <Box padded style={{ flex: 1 }}>
      <Text style={style.subtitle}>
        {when
          ? `${t(`screens.home_stack.uploaded_screen.${subtitle}`)}\n${readableDateTime(toLocalDateTime(when), locale)}`
          : ""}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.tint} style={{ marginTop: theme.spacing.lg }} />
      ) : rows.length === 0 ? (
        <Text style={style.empty}>
          {t(isDevice ? "screens.home_stack.uploaded_screen.empty_device" : "screens.home_stack.uploaded_screen.empty")}
        </Text>
      ) : (
        <ScrollView style={style.list}>
          {rows.map(m => {
            const { name: propertyName, suffix } = splitPropertyName(m.property.name);
            return (
              <View key={m.property.name} style={style.row} testID="uploaded-property">
                <Text style={style.name}>
                  {labels?.[m.property.name] ??
                    (FALLBACK_LABELS[m.property.name] ? t(FALLBACK_LABELS[m.property.name]) : propertyName)}
                </Text>
                <Text style={style.value}>{formatValue(m.value, suffix, locale, words)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
      <Box style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
        <Button
          containerStyle={{ flex: 1 }}
          title={t("screens.home_stack.uploaded_screen.back_button") as string}
          type="outline"
          onPress={() => navigation.navigate("HomeScreen")}
          icon={{ name: "arrow-back-circle-outline", type: "ionicon", color: theme.colors.tint }}
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
