import { Platform } from "react-native";
import { checkNotifications, PermissionStatus, requestNotifications } from "react-native-permissions";

// Android 13+ asks for POST_NOTIFICATIONS; react-native-permissions 5 handles that through
// checkNotifications/requestNotifications. On iOS the app does not ask here (as before).
const ASKS_FOR_NOTIFICATIONS = Platform.OS === "android";

export default function useNotificationPermission() {
  const requestNotificationPermission = async () => {
    const hasNotificationPermission = await checkNotificationPermission();
    if (hasNotificationPermission === 2) return;

    // Request permissions if not granted
    const { status } = await requestNotifications([]);
    if (status !== "granted") {
      throw new Error("Notification permission not granted");
    }
  };

  const checkNotificationPermission = async () => {
    if (!ASKS_FOR_NOTIFICATIONS) return 2;
    const { status } = await checkNotifications();
    return toLevel(status);
  };

  return { requestNotificationPermission, checkNotificationPermission };
}

function toLevel(status: PermissionStatus) {
  if (status === "granted") {
    return 2; // "granted" -> 2
  } else if (status === "denied") {
    return 1; // "denied" -> 1
  } else {
    return 0; // "default" -> 0 (or any other status)
  }
}
