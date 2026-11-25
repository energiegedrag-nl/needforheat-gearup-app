import { makeStyles, useTheme } from "@rneui/themed";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import useTranslation from "@/hooks/translation/useTranslation";
import { progressFraction, showProgress, timeLeft } from "@/lib/progress/progress";

const SHINE_WIDTH = 40;

type SlowProgressProps = {
  /** Expected duration of the step in seconds; without it the bar only shines and shows the time spent. */
  expected__s?: number;
};

/**
 * Shown under a running step once it takes longer than people normally wait: a thin bar with a
 * moving shine (the app is still working), the seconds spent and, when known, the seconds left.
 * Mounted when the step starts, so it counts from its own mount.
 */
export default function SlowProgress({ expected__s }: SlowProgressProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useStyles();
  const start = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [width, setWidth] = useState(0);
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const elapsed = (now - start.current) / 1000;
  const visible = showProgress(elapsed);

  useEffect(() => {
    if (!visible || !width) return;
    const loop = Animated.loop(
      Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [visible, width]);

  if (!visible) return null;

  const known = expected__s !== undefined && expected__s > 0;
  const fraction = known ? progressFraction(elapsed, expected__s) : 1;
  const seconds = Math.floor(elapsed);
  let label = t("components.timeline.busy", { elapsed: seconds });
  if (known) {
    const left = timeLeft(elapsed, expected__s);
    label =
      left.kind === "seconds"
        ? t("components.timeline.left", { elapsed: seconds, left: left.value })
        : t(`components.timeline.${left.kind}`, { elapsed: seconds });
  }

  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-SHINE_WIDTH, width] });

  return (
    <View style={styles.container} testID="timeline-slow-progress">
      <View style={styles.track} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <View
          style={[
            styles.fill,
            { width: fraction * width, backgroundColor: known ? theme.colors.primary : theme.colors.grey3 },
          ]}
        />
        <Animated.View style={[styles.shine, { transform: [{ translateX }] }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    marginTop: 2,
    marginBottom: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.grey4,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  shine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SHINE_WIDTH,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.grey1,
  },
}));
