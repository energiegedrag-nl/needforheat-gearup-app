import { makeStyles, useTheme } from "@rneui/themed";
import { TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

/** The floating question mark of the home screen: opens the explanation of the data sources. */
const CircleMenu = ({ onClickEvent }: { onClickEvent: () => void }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClickEvent} style={{ alignItems: "flex-end" }} accessibilityRole="button">
        <View style={styles.fab}>
          <Icon name="help" size={32} color={theme.colors.onPrimary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const useStyles = makeStyles(theme => ({
  container: {
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    // A soft blue glow under the button.
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
}));

export default CircleMenu;
