import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Button, makeStyles, Text, useTheme } from "@rneui/themed";
import { Image, ScrollView, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import Box from "@/components/elements/Box";
import EnergyBackdrop from "@/components/elements/EnergyBackdrop";
import useTranslation from "@/hooks/translation/useTranslation";
import { HomeStackParamList } from "@/types/navigation";

export default function UnauthenticatedHomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const styles = useStyles();

  function onInvitedPress() {
    navigation.navigate("AlreadyInvitedScreen");
  }

  return (
    <Box padded style={styles.container}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={{ flexGrow: 1 }}>
        <EnergyBackdrop style={styles.hero}>
          <Image style={styles.logo} source={require("../../../../assets/logo.png")} />
          <Text style={styles.title}>{t("screens.home_stack.home.unauthenticated.title")}</Text>
          <Text style={styles.subtitle}>{t("screens.home_stack.home.unauthenticated.subtitle")}</Text>
        </EnergyBackdrop>
        <View style={styles.note}>
          <Icon name="mail-unread-outline" size={24} color={theme.colors.tint} style={styles.noteIcon} />
          <Text style={styles.description}>{t("screens.home_stack.home.unauthenticated.description")}</Text>
        </View>
      </ScrollView>
      <Button
        fullWidth
        onPress={onInvitedPress}
        icon={{ name: "arrow-forward", type: "ionicon", color: theme.colors.onPrimary }}
        iconRight
        iconContainerStyle={{ marginLeft: theme.spacing.sm }}
      >
        {t("screens.home_stack.home.unauthenticated.already_invited")}
      </Button>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  hero: {
    width: "100%",
    borderRadius: 28,
    alignItems: "center",
    paddingTop: theme.spacing.xl * 1.5,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: "RobotoBlack",
    fontSize: 30,
    letterSpacing: 0.5,
    textAlign: "center",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.85)",
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteIcon: {
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  description: {
    flex: 1,
    lineHeight: 23,
    color: theme.colors.grey1,
  },
}));
