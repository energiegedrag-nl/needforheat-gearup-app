import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";

import App from "./App";

// Local notifications only (no push service): see src/hooks/notification/useNotificationChecker.tsx.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

Notifications.setNotificationChannelAsync("777", {
  // every ASCII in NFH starts with 7
  name: "NeedForHeat",
  description: "Notifications for DataSources",
  importance: Notifications.AndroidImportance.DEFAULT,
}).catch(err => console.error("createChannel failed", err));

Notifications.requestPermissionsAsync().catch(err => console.error("notification permission request failed", err));

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
