import { MANUAL_URL } from "@env";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ListItem, makeStyles, Text, useTheme } from "@rneui/themed";
import { Alert, FlatList, Linking, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import Box from "@/components/elements/Box";
import useTranslation from "@/hooks/translation/useTranslation";
import useUser from "@/hooks/user/useUser";
import { InfoStackParamList } from "@/types/navigation";

type InfoItemBase = { title: string; icon: string };
type InfoItemURI = InfoItemBase & { uri: string };
type InfoItemRoute = InfoItemBase & { route: keyof InfoStackParamList };
type InfoItem = InfoItemURI | InfoItemRoute;

type InfoItemProps = {
  item: InfoItem;
  onPress: () => void;
};

function InfoListItem({ item, onPress }: InfoItemProps) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <ListItem Component={TouchableOpacity} onPress={onPress} style={styles.item}>
      <Ionicons style={styles.icon} name={item.icon} size={theme.spacing.xl} />
      <ListItem.Content>
        <Text h4>{item.title}</Text>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );
}

type InfoScreenProps = NativeStackScreenProps<InfoStackParamList, "InfoScreen">;

export default function InfoScreen({ navigation }: InfoScreenProps) {
  const styles = useStyles();
  const { t, resolvedLanguage } = useTranslation();
  const { user } = useUser();

  // Campaign pages come from the campaign (returned by the API with the user); without a campaign,
  // the generic pages on our own manual server (MANUAL_URL) are used. Was hard-coded to the
  // Windesheim manual server before.
  function campaignPageUri(page: "info" | "faq" | "privacy") {
    const base = (user?.campaign?.info_url || `${MANUAL_URL}/campaigns/generic`).replace(/\/+$/, "");
    return `${base}/${page}/${resolvedLanguage ? resolvedLanguage + "/" : ""}`;
  }

  const data: InfoItem[] = [
    {
      title: t("screens.info_stack.about.title"),
      uri: campaignPageUri("info"),
      icon: "book-outline",
    },
    {
      title: t("screens.info_stack.faq.title"),
      uri: campaignPageUri("faq"),
      icon: "help-circle-outline",
    },
    {
      title: t("screens.info_stack.privacy.title"),
      uri: campaignPageUri("privacy"),
      icon: "shield",
    },
  ];

  const onPress = async (item: InfoItem) => {
    if ("uri" in item) {
      try {
        await Linking.openURL(item.uri);
      } catch {
        Alert.alert(
          t("screens.info_stack.info.unsuported_url_alert.title"),
          t("screens.info_stack.info.unsuported_url_alert.message", { url: item.uri })
        );
      }
    } else {
      navigation.navigate(item.route);
    }
  };
  return (
    <Box style={{ flex: 1 }}>
      <FlatList data={data} renderItem={({ item }) => <InfoListItem item={item} onPress={() => onPress(item)} />} />
      <Box fullWidth style={styles.centerContainer}>
        <Text>
          {t("screens.info_stack.info.campaign")}: {user?.campaign.name}
        </Text>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  icon: {
    paddingRight: theme.spacing.lg,
  },
  centerContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
}));
