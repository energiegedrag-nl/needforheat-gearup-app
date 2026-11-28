import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Button, ListItem, makeStyles, useTheme } from "@rneui/themed";
import { useQuery } from "@tanstack/react-query";
import * as Burnt from "burnt";
import cronParser from "cron-parser";
import { format } from "date-fns";
import { enUS, nl } from "date-fns/locale";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { Platform, ToastAndroid, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import TimeProgressBar from "./timeProgressBar";

import useTranslation from "@/hooks/translation/useTranslation";
import { useOpenExternalLink } from "@/hooks/useOpenExternalLink";
import { MANUAL_NAMES_STALE_TIME_MS } from "@/lib/queryCache/policy";
import { AllDataSourcesResponse, DataSourceType } from "@/types/api";
import { HomeStackParamList } from "@/types/navigation";
import { capitalizeFirstLetter, checkMissedUpload, getManualUrl, toLocalDateTime } from "@/utils/tools";
import "intl";
import "intl/locale-data/jsonp/en";
import { ListItemTouchableHighlight } from "@/lib/listItemTouchables";
import { withAlpha } from "@/lib/theme";

type WifiNetworkListItemProps = {
  item: AllDataSourcesResponse;
  onSwipeBegin?: () => void;
  onSwipeEnd?: () => void;
  allItemsDone: boolean;
  refreshAfter20Seconds: () => void;
};

export default function DeviceListItem(props: WifiNetworkListItemProps) {
  const { item, onSwipeBegin, onSwipeEnd, allItemsDone, refreshAfter20Seconds } = props;
  const { navigate } = useNavigation<NavigationProp<HomeStackParamList>>();
  const { openUrl } = useOpenExternalLink();
  const { theme } = useTheme();
  const style = useStyles();
  const { t, resolvedLanguage } = useTranslation();
  const CompleteURL = getManualUrl(item.data_source as DataSourceType);
  const [missed, setMissed] = useState(0);
  const [timeToUpload, setTimeToUpload] = useState<string>();

  const locales: Record<string, Locale> = {
    "en-US": enUS,
    "nl-NL": nl,
  };

  const getNormalName = (): string => {
    // Name in the app language, else in the other language, else the technical name.
    const names = (data ?? {}) as Record<string, string | undefined>;
    const name = names[resolvedLanguage] || names["en-US"] || names["nl-NL"] || item.data_source?.item?.Name || "";

    return capitalizeFirstLetter(name) || name;
  };

  const onReset = (close: () => void) => {
    if (item.data_source?.category === "device_type") {
      navigate("QrScannerScreen", {
        expectedDeviceName: item.name,
        device_TypeName: item.name,
        dataSource: item,
        normalName: getNormalName(),
      });
    }
    close();
  };

  const handleItemClick = () => {
    if (Platform.OS === "android") {
      ToastAndroid.show(t("screens.device_overview.toast_message"), ToastAndroid.LONG);
    } else {
      Burnt.toast({
        title: t("screens.device_overview.toast_title"),
        message: t("screens.device_overview.toast_message") as string,
        preset: "error",
      });
    }
  };

  const openManual = () => {
    if (item.data_source?.category === "device_type") {
      navigate("QrScannerScreen", {
        expectedDeviceName: undefined,
        device_TypeName: "",
        dataSource: item,
        normalName: getNormalName(),
      });
    } else if (item.data_source?.category === "cloud_feed_type") {
      navigate("AddOnlineDataSourceScreen");
    } else if (item.data_source?.category === "energy_query_type") {
      // Straight to the question; the explanation is behind the question mark there.
      if (item.data_source.item.Name === "weather-interpolation-location") {
        navigate("HomeSelectScreen", { dataSource: item.data_source });
      } else if (item.data_source.item.Name === "building-profile") {
        navigate("HomeAddressSelectScreen", { dataSource: item.data_source });
      } else {
        navigate("InformationScreen", { dataSource: item.data_source });
      }
    }
  };

  const openResult = () => {
    if (!item.name) return;
    if (item.data_source?.category === "device_type") {
      navigate("UploadedDataScreen", { source: "device", name: item.name });
      return;
    }
    if (item.data_source?.category !== "energy_query_type") return;
    if (item.name === "weather-interpolation-location") {
      navigate("WeatherLocationPostedScreen");
      return;
    }
    navigate("UploadedDataScreen", { source: "energy_query", name: item.name });
  };

  const openHelpUrl = () => {
    if (item.data_source?.faq_url) {
      openUrl(item.data_source.faq_url, false);
    }
  };

  // The names come from the manual server; they hardly change: once a day, from the cache in between (also after a
  // restart), instead of on every render of the list.
  const { data } = useQuery({
    queryKey: ["manual-names", CompleteURL],
    queryFn: async () => {
      const response = await fetch(`${CompleteURL}`);
      if (!response.ok) throw new Error(`manual names: HTTP ${response.status}`);
      return (await response.json()) as Record<string, string>;
    },
    staleTime: MANUAL_NAMES_STALE_TIME_MS,
    retry: 1,
  });
  // End region

  function formatDateAndTime(date?: Date) {
    const inputDate = date || new Date();
    const locale = locales[resolvedLanguage] || enUS;

    let formatString = "cccccc, LLL d, yyy HH:mm";

    if (resolvedLanguage === "nl-NL") {
      formatString = "cccccc d LLL yyy HH:mm";
    }

    return format(inputDate, formatString, { locale });
  }

  function checkNextUpload(item: AllDataSourcesResponse): string {
    const latestUpload =
      item.latest_upload && item.latest_upload > 1073347200
        ? toLocalDateTime(item.latest_upload)
        : toLocalDateTime(item.activated_at);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const now = DateTime.now().toISO({ includeOffset: false })!;
    const timeNow = DateTime.fromISO(now);
    let cronExpression = item.data_source?.upload_schedule ?? "";
    if (!latestUpload) return "0/0";

    // Replace '0' in cron expression with corresponding value from latestUpload
    const parts = cronExpression.split(" ");
    if (parts.includes("0")) {
      const [minute, hour, daym, month, dayw] = parts;
      cronExpression = [
        minute === "0" ? latestUpload.getMinutes().toString() : minute,
        hour === "0" ? latestUpload.getHours().toString() : hour,
        daym === "0" ? latestUpload.getDate().toString() : daym, // Day of the month
        month === "0" ? (latestUpload.getMonth() + 1).toString() : month, // Month (0-11, so we add 1)
        dayw === "0" ? latestUpload.getDay().toString() : dayw, // Day of the week
      ].join(" ");
    }

    try {
      const intervalIterator = cronParser.parseExpression(cronExpression, { currentDate: latestUpload });
      const scheduledTime = intervalIterator.next().toDate();
      // Calculate minutes until the next upload
      const timeToUpload = Math.ceil((scheduledTime.getTime() - timeNow.toMillis()) / (1000 * 60));
      if (timeToUpload < 0) {
        return "0/0";
      } else {
        const timeTotal = Math.ceil((scheduledTime.getTime() - latestUpload.getTime()) / (1000 * 60));
        return `${timeToUpload}/${timeTotal}`;
      }
    } catch (error) {
      console.error("Error parsing cron expression:", error);
      return "0/0";
    }
  }

  function updateMonitoring() {
    setTimeToUpload(checkNextUpload(item));
    setMissed(checkMissedUpload(item));
  }

  useEffect(() => {
    if (item.latest_upload || item.activated_at) {
      updateMonitoring();
    }
  }, [item, timeToUpload, missed]);

  const handleTimePassedByMinute = () => {
    if (item.latest_upload || item.activated_at) {
      updateMonitoring();

      if (timeToUpload) {
        const [elapsedTime, totalTime] = timeToUpload.split("/").map(Number);
        if (elapsedTime === 0 && totalTime >= 0) {
          refreshAfter20Seconds();
        }
      }
    }
  };

  const category = item.data_source?.category;
  const categoryIcon = category === "energy_query_type" ? "flash" : category === "cloud_feed_type" ? "cloud" : "layers";
  const done = item.connected === 2;
  const locked = item.connected === 1;
  // Done: green when on schedule, amber when an upload is late, red when it is very late. An energy query is
  // done once sent.
  const doneColor =
    category === "energy_query_type" || missed === 0
      ? theme.colors.success
      : missed === -1 || missed >= 1
      ? theme.colors.warning
      : theme.colors.error;
  const badgeColor = done ? doneColor : locked ? theme.colors.disabled : theme.colors.tint;
  const badgeBackground = done
    ? withAlpha(doneColor, 0.16)
    : locked
    ? theme.colors.surfaceAlt
    : theme.colors.primarySoft;
  const cardBackground = locked
    ? theme.colors.surfaceAlt
    : done && !allItemsDone
    ? theme.colors.successSoft
    : theme.colors.surface;

  return (
    <>
      <ListItem.Swipeable
        testID="device-list-item"
        onPress={() => {
          if (item.connected === 1) {
            handleItemClick();
          }
          if (item.connected === 0) {
            openManual();
          }
          if (item.connected === 2) {
            openResult();
          }
        }}
        onSwipeBegin={onSwipeBegin}
        onSwipeEnd={onSwipeEnd}
        leftWidth={0}
        rightContent={
          item.connected === 2 &&
          !(item.data_source?.category === "cloud_feed_type") &&
          !(item.data_source?.category === "energy_query_type")
            ? close => (
                <Button
                  title={t("screens.device_overview.device_list.reset_device") as string}
                  onPress={() => onReset(close)}
                  containerStyle={style.resetContainer}
                  buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.primary }}
                />
              )
            : null
        }
        style={[style.listItem]}
        containerStyle={[style.card, { backgroundColor: cardBackground }]}
        Component={ListItemTouchableHighlight}
      >
        <View style={[style.badge, { backgroundColor: badgeBackground }]}>
          <Icon name={done ? categoryIcon : `${categoryIcon}-outline`} color={badgeColor} size={20} />
        </View>
        <ListItem.Content>
          <ListItem.Title style={{ color: locked ? theme.colors.grey3 : theme.colors.text }}>
            {getNormalName()}
          </ListItem.Title>
          {item.connected === 2 && item.data_source?.category !== "energy_query_type" ? (
            <ListItem.Subtitle style={[style.listItemSubtitle]}>
              {item.latest_upload || item.activated_at
                ? t("screens.device_overview.device_list.device_info.last_seen", {
                    date: formatDateAndTime(
                      toLocalDateTime(
                        item.latest_upload && item.latest_upload > 0 ? item.latest_upload : item.activated_at
                      )
                    ),
                  })
                : t("screens.device_overview.device_list.device_info.no_data")}
            </ListItem.Subtitle>
          ) : null}
          {timeToUpload && item.connected === 2 && item.data_source?.category !== "energy_query_type" ? (
            <TimeProgressBar
              progress={timeToUpload}
              onTimePassedByMinute={handleTimePassedByMinute}
              notificationSent={missed === -2}
            />
          ) : null}
        </ListItem.Content>
        <View style={{ flexDirection: "column" }}>
          {item.data_source?.faq_url !== "" ? (
            <TouchableOpacity onPress={openHelpUrl} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="help-circle-outline" size={28} color={locked ? theme.colors.grey3 : theme.colors.grey2} />
            </TouchableOpacity>
          ) : null}
        </View>
        {item.connected === 2 &&
        item.data_source?.category !== "cloud_feed_type" &&
        item.data_source?.category !== "energy_query_type" ? (
          <Icon
            name="reorder-three-outline"
            size={10}
            color={theme.colors.grey3}
            style={{ transform: [{ rotate: "90deg" }, { scaleX: 2 }, { scaleY: 2 }], marginLeft: -10 }}
          />
        ) : null}
      </ListItem.Swipeable>
    </>
  );
}

const useStyles = makeStyles(theme => ({
  listItem: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 5,
    overflow: "hidden",
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemSubtitle: {
    marginRight: 24,
    marginTop: 2,
  },
  resetContainer: {
    marginVertical: 5,
    borderRadius: 16,
    overflow: "hidden",
  },
}));
