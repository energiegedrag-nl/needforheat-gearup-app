import { makeStyles, useTheme } from "@rneui/themed";
import { ActivityIndicator, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { TimelineItem } from ".";

type IconProps = {
  item: TimelineItem;
  /** Step number, shown while the step has not started (a tick would suggest it is done). */
  number: number;
};

export default function TimelineIcon(props: IconProps) {
  const { item, number } = props;
  const { theme } = useTheme();
  const styles = useStyles();

  if (item.error) {
    return (
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.error }]}>
        <Ionicons name="close" size={16} color={theme.colors.white} />
      </View>
    );
  }
  if (item.finished) {
    return (
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.success }]}>
        <Ionicons name="checkmark" size={16} color={theme.colors.white} />
      </View>
    );
  }
  if (item.loading) {
    return (
      <View style={[styles.iconWrapper, styles.outlined, { borderColor: theme.colors.primary }]}>
        <ActivityIndicator size="small" style={styles.loadingIndicator} color={theme.colors.primary} />
      </View>
    );
  }
  // Not started: a hollow circle with the step number.
  return (
    <View style={[styles.iconWrapper, styles.outlined, { borderColor: theme.colors.grey3 }]}>
      <Text style={styles.number}>{number}</Text>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  outlined: {
    borderWidth: 2,
    backgroundColor: theme.colors.background,
  },
  number: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.grey2,
  },
  loadingIndicator: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
}));
