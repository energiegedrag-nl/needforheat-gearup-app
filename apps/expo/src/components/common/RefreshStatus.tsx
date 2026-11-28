import { Text, useTheme } from "@rneui/themed";
import { ActivityIndicator, View } from "react-native";

import useTranslation from "@/hooks/translation/useTranslation";
import { formatUpdatedAt } from "@/lib/queryCache/policy";

type RefreshStatusProps = {
  /** New data is being fetched right now (by the user pulling down, or by the app itself). */
  fetching: boolean;
  /** When the data on screen was fetched (ms); 0 when unknown. */
  updatedAt: number;
  /** The last attempt failed; the data on screen is older. */
  failed?: boolean;
};

/**
 * One small line above a list: "Bijwerken…" while fetching, else when the data on screen is from, so old data is
 * never shown as if it were current (stale-while-revalidate, as mail and weather apps do).
 */
export default function RefreshStatus({ fetching, updatedAt, failed }: RefreshStatusProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const weekdays = String(t("common.refresh_status.weekdays")).split(",");
  const when = updatedAt ? formatUpdatedAt(updatedAt, Date.now(), weekdays) : "";
  const text = fetching
    ? t("common.refresh_status.fetching")
    : failed && when
      ? t("common.refresh_status.failed", { when })
      : when
        ? t("common.refresh_status.updated", { when })
        : "";
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 4 }}>
      {fetching && <ActivityIndicator size="small" color={theme.colors.tint} style={{ marginRight: 6 }} />}
      <Text style={{ fontSize: 12, color: failed ? theme.colors.error : theme.colors.grey2 }}>{text}</Text>
    </View>
  );
}
