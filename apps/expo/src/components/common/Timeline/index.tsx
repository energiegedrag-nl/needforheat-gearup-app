import { makeStyles } from "@rneui/themed";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";

import BottomLine from "./_bottomLine";
import SlowProgress from "./_slowProgress";
import TimelineIcon from "./_timelineIcon";
import TopLine from "./_topLine";

import useStepDurations from "@/hooks/stepDurations/useStepDurations";

export type TimelineItem = {
  title: string;
  description?: string;
  finished?: boolean;
  error?: boolean;
  loading?: boolean;
  /**
   * Key under which the duration of this step is remembered on the phone, so a slow step can say how
   * long it will probably take. Without it a slow step shows only the time spent.
   */
  timingKey?: string;
  /** Expected duration in seconds until the phone has timed the step itself. */
  expected__s?: number;
};

type TimelineProps = {
  items: TimelineItem[];
};

const isRunning = (item: TimelineItem) => !!item.loading && !item.error && !item.finished;

export default function Timeline(props: TimelineProps) {
  const { items } = props;
  const itemCount = items.length;
  const styles = useStyles();
  const { durations, record } = useStepDurations();

  // Time each step from start to finish, to expect its duration next time.
  const starts = useRef<Record<number, number>>({});
  useEffect(() => {
    items.forEach((item, index) => {
      const start = starts.current[index];
      if (isRunning(item) && start === undefined) starts.current[index] = Date.now();
      if (!isRunning(item) && start !== undefined) {
        if (item.finished && item.timingKey) record(item.timingKey, (Date.now() - start) / 1000);
        delete starts.current[index];
      }
    });
  });

  return (
    <View>
      {items.map((item, index) => {
        const pending = !item.loading && !item.finished && !item.error;
        return (
          <View key={index} style={styles.itemContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.nestedItemContainer}>
                <TopLine item={item} index={index} />
                <BottomLine index={index} nextItem={items[index + 1]} itemCount={itemCount} />
                <TimelineIcon item={item} number={index + 1} />
              </View>
            </View>

            <View style={styles.contentContainer}>
              <Text style={[styles.titleText, pending && styles.pendingText]}>{item.title}</Text>
              {item.description && (
                <Text style={[styles.secondaryText, pending && styles.pendingText]}>{item.description}</Text>
              )}
              {isRunning(item) ? (
                <SlowProgress expected__s={(item.timingKey && durations[item.timingKey]) || item.expected__s} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "85%",
  },
  iconContainer: {
    paddingHorizontal: 16,
    height: "100%",
  },
  nestedItemContainer: {
    position: "relative",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    paddingVertical: 10,
    flex: 1,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  secondaryText: {
    marginBottom: 4,
  },
  pendingText: {
    color: theme.colors.grey2,
  },
  mutedText: {
    fontSize: 12,
    color: theme.colors.disabled,
  },
}));
