import { StyleSheet, View, ViewProps } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { BRAND } from "@/lib/theme";

/**
 * The brand's backdrop: midnight blue running into electric blue, with a cyan glow in the corner, the colours of
 * the icon. The same in light and dark mode (it is a picture, with white text on it).
 */
export default function EnergyBackdrop({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="energy" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BRAND.midnight} />
            <Stop offset="0.55" stopColor={BRAND.deep} />
            <Stop offset="1" stopColor={BRAND.volt} />
          </LinearGradient>
          <RadialGradient id="glow" cx="88" cy="8" r="55" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={BRAND.spark} stopOpacity="0.55" />
            <Stop offset="1" stopColor={BRAND.spark} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#energy)" />
        <Circle cx="88" cy="8" r="55" fill="url(#glow)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
