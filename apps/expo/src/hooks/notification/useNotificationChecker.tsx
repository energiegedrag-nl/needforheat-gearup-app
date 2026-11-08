import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import useTranslation from "../translation/useTranslation";

import { fetchCloudFeeds } from "@/api/account";
import { fetchDevices } from "@/api/device";
import { fetchEnergyQueries } from "@/api/energyquery";
import { fetchUser } from "@/api/user";
import { checkMissedUpload, processDataSource } from "@/utils/tools";

export default function useSuperLateDataSourceNotifier() {
  const { t } = useTranslation();

  const NOTIFICATION_HOUR_START = 22; // Start of silent hours (10 PM)
  const NOTIFICATION_HOUR_END = 7; // End of silent hours (7 AM)

  const notificationSentTodayKey = "notificationSentToday";

  const shouldSendNotification = async () => {
    const lastNotificationSent = await SecureStore.getItemAsync(notificationSentTodayKey);
    const notificationSentToday =
      lastNotificationSent && new Date(lastNotificationSent).getDate() === new Date().getDate();
    return !notificationSentToday;
  };

  const saveNotificationSentToday = async () => {
    await SecureStore.setItemAsync(notificationSentTodayKey, new Date().toString());
  };

  const checkDataSources = async () => {
    console.log("Running background task to fetch devices, check status, and send notification...");
    let sendNotification = false;
    let badgeCounter = 0;

    const user = await fetchUser();
    const data = await fetchDevices();
    const cloudFeedData = await fetchCloudFeeds();
    const energyQueryData = await fetchEnergyQueries();
    const dataSourceList = user?.campaign.data_source_list;

    dataSourceList?.items.forEach(dataSource => {
      const processedDataSource = processDataSource(dataSource, data, cloudFeedData, energyQueryData, dataSourceList);
      if (checkMissedUpload(processedDataSource) === -2) {
        sendNotification = true;
        badgeCounter += 1;
      }
    });

    if (sendNotification) {
      const currentHour = new Date().getHours();
      let silentNotification = false;

      // Check if current hour is within silent hours (from 10 PM to 7 AM)
      if (currentHour >= NOTIFICATION_HOUR_START || currentHour < NOTIFICATION_HOUR_END) {
        console.log("Silent hours, turning off sound...");
        silentNotification = true;
      }

      const shouldSend = await shouldSendNotification();
      if (!shouldSend) {
        console.log("Notification already sent today.");
        await Notifications.setBadgeCountAsync(badgeCounter);
        return;
      }

      // Note: the previous implementation enabled sound/vibration *during* silent hours (inverted flag).
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("notifications.title") as string,
          body: t("notifications.message") as string,
          subtitle: Platform.OS === "ios" ? undefined : (t("notifications.subText") as string),
          badge: badgeCounter,
          sound: !silentNotification,
          color: "#ee3135",
        },
        // Show immediately; on Android in channel "777" (created in index.js).
        trigger: Platform.OS === "android" ? { channelId: "777" } : null,
      });

      await saveNotificationSentToday();
    }
  };

  return { checkDataSources };
}
