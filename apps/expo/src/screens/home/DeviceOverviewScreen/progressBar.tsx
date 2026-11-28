import { makeStyles, Text, useTheme } from "@rneui/themed";
import React from "react";
import { View } from "react-native";

/** How many data sources are done, as "3/5" beside a bar: blue while busy, green when all are done. */
const ProgressBar = ({ progress }: { progress: string }) => {
  const [connectedCount, totalCount] = progress.split("/").map(Number);
  const { theme } = useTheme();
  const styles = useStyles();
  const complete = totalCount > 0 && connectedCount >= totalCount;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              flex: connectedCount,
              backgroundColor: complete ? theme.colors.success : theme.colors.primary,
            },
          ]}
        >
          {/* The spark at the end of the bar. */}
          {connectedCount > 0 && !complete ? <View style={styles.spark} /> : null}
        </View>
        <View style={{ flex: Math.max(totalCount - connectedCount, 0) }} />
      </View>
      <Text style={styles.label}>{progress}</Text>
    </View>
  );
};

const useStyles = makeStyles(theme => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 2,
  },
  track: {
    flex: 1,
    flexDirection: "row",
    height: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 5,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  spark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  label: {
    marginLeft: 10,
    fontFamily: "RobotoBold",
    fontSize: 14,
    color: theme.colors.grey1,
  },
}));

export default ProgressBar;
