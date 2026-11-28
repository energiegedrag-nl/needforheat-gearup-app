import { defaultSpacing } from "@rneui/base";
import { Colors, createTheme, CreateThemeOptions } from "@rneui/themed";
import { Theme as NavigationTheme } from "@react-navigation/native";

/**
 * "Volt": the energiegedrag.nl look. Electric blue with a cyan spark on midnight blue, as the element tile 'Eg'
 * of the icon (assets/brand/make_icons.py). The only place for brand colours.
 *
 * Contrast (WCAG): text on background and surface >= 4.5 in both modes, white text on primary, success and error
 * >= 4.5 in light mode and on primary and error in dark mode; muted text >= 4.5 everywhere.
 */
export const BRAND = {
  /** Midnight blue: splash, icon background, the dark backdrop. */
  midnight: "#071330",
  /** Electric blue: the brand colour. */
  volt: "#1D4FE0",
  /** Cyan spark: highlights and the end of the gradient. */
  spark: "#22C8F5",
};

export type ColorScheme = "light" | "dark";

declare module "@rneui/themed" {
  export interface Colors {
    /** Text and icons on primary, success and error. */
    onPrimary: string;
    /** Primary as a colour for text and icons on the background (lighter in dark mode, to stay readable). */
    tint: string;
    /** Cards, sheets, headers and the tab bar. */
    surface: string;
    /** Inputs, tracks and pressed or disabled cards. */
    surfaceAlt: string;
    /** Hairlines around cards and between rows. */
    border: string;
    /** Body text (the same as black, by name). */
    text: string;
    /** Secondary text. */
    textMuted: string;
    /** A light wash of primary, behind icons. */
    primarySoft: string;
    /** A light wash of success: a source that is done while others are not. */
    successSoft: string;
    /** The cyan spark. */
    accent: string;
  }
}

const LIGHT: Partial<Colors> = {
  primary: BRAND.volt,
  secondary: "#0E7FA8",
  background: "#F3F6FC",
  white: "#FFFFFF", // RNEUI: surfaces
  black: "#0E1A33", // RNEUI: text
  grey0: "#26324D",
  grey1: "#3E4A63",
  grey2: "#56627C",
  grey3: "#8B96AE",
  grey4: "#D5DCEA",
  grey5: "#EBEFF7",
  greyOutline: "#C3CBDC",
  searchBg: "#E9EEF8",
  divider: "#DCE3F0",
  success: "#15803D",
  error: "#C62F3B",
  warning: "#B45309",
  disabled: "#A9B3C7",

  onPrimary: "#FFFFFF",
  tint: BRAND.volt,
  surface: "#FFFFFF",
  surfaceAlt: "#E9EEF8",
  border: "#DCE3F0",
  text: "#0E1A33",
  textMuted: "#56627C",
  primarySoft: "#E4ECFF",
  successSoft: "#DDF5E6",
  accent: BRAND.spark,
};

const DARK: Partial<Colors> = {
  primary: "#3A6BF5",
  secondary: "#22C8F5",
  background: "#0A1020",
  white: "#131C33", // RNEUI: surfaces
  black: "#E8EEFC", // RNEUI: text
  grey0: "#D3DBEE",
  grey1: "#B7C2DC",
  grey2: "#9AA8C8",
  grey3: "#6E7B9A",
  grey4: "#2A3553",
  grey5: "#1B2540",
  greyOutline: "#34405F",
  searchBg: "#1B2540",
  divider: "#26314F",
  success: "#22A55B",
  error: "#E5484D",
  warning: "#F5B544",
  disabled: "#3A4565",

  onPrimary: "#FFFFFF",
  tint: "#7FA2FF",
  surface: "#131C33",
  surfaceAlt: "#1B2540",
  border: "#26314F",
  text: "#E8EEFC",
  textMuted: "#9AA8C8",
  primarySoft: "#18295A",
  successSoft: "#123826",
  accent: BRAND.spark,
};

/** "#RRGGBB" with an opacity, as "rgba(...)" (for charts and washes). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const fontWeightMap = {
  100: "Thin",
  300: "Light",
  400: "Regular",
  500: "Medium",
  700: "Bold",
  900: "Black",
} as const;

const base: CreateThemeOptions = {
  lightColors: LIGHT,
  darkColors: DARK,
  mode: "light",
  spacing: defaultSpacing,
  components: {
    ListItem: {
      containerStyle: {
        backgroundColor: "transparent",
      },
    },
    ListItemTitle: (_, theme) => ({
      style: { fontFamily: "RobotoMedium", color: theme.colors.black },
    }),
    ListItemSubtitle: (_, theme) => ({
      style: { fontFamily: "RobotoRegular", fontSize: 13, color: theme.colors.grey2 },
    }),
    Text: (props, theme) => ({
      style: {
        fontFamily: props.bold
          ? "RobotoBold"
          : props.fontWeight
          ? `Roboto${fontWeightMap[props.fontWeight]}`
          : "RobotoRegular",
        fontSize: 16,
        color: theme.colors.black,
      },
      h1Style: { fontFamily: "RobotoBold", color: theme.colors.black },
      h2Style: { fontFamily: "RobotoBold", color: theme.colors.black },
      h3Style: { fontFamily: "RobotoBold", color: theme.colors.black },
      h4Style: { fontFamily: "RobotoBold", color: theme.colors.black },
    }),
    Box: props => ({
      style: {
        padding: props.padded ? defaultSpacing.md : 0,
        flex: props.center ? 1 : 0,
        justifyContent: props.center ? "center" : "flex-start",
        alignItems: props.center ? "center" : "flex-start",
        width: props.fullWidth ? "100%" : "auto",
      },
    }),
    Button: (props, theme) => {
      const solid = !props.type || props.type === "solid";
      return {
        radius: 14,
        containerStyle: {
          width: props.fullWidth ? "100%" : "auto",
          borderRadius: 14,
        },
        buttonStyle: {
          paddingVertical: 12,
          ...(props.type === "outline" ? { borderWidth: 1.5, borderColor: theme.colors.primary } : null),
        },
        titleStyle: {
          fontFamily: "RobotoMedium",
          color: solid ? theme.colors.onPrimary : theme.colors.tint,
        },
        disabledTitleStyle: {
          color: theme.colors.grey3,
        },
        disabledStyle: {
          backgroundColor: theme.colors.surfaceAlt,
        },
      };
    },
    Screen: (_, theme) => ({
      style: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
    }),
    Input: (props, theme) => ({
      style: {
        width: props.fullWidth ? "100%" : "auto",
        color: theme.colors.black,
      },
      placeholderTextColor: theme.colors.grey3,
      containerStyle: {
        borderRadius: 12,
        paddingHorizontal: 0,
      },
      inputContainerStyle: {
        borderBottomWidth: 0,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceAlt,
        paddingHorizontal: theme.spacing.md,
      },
      inputStyle: {
        color: theme.colors.black,
      },
      errorStyle: {
        display: props.errorMessage ? "flex" : "none",
      },
    }),
  },
};

/** The RNEUI theme for a colour scheme. */
export function makeTheme(mode: ColorScheme) {
  return createTheme({ ...base, mode });
}

/** The base theme (light); the provider switches it to the scheme in use. */
export const theme = makeTheme("light");

/** The colours of a scheme without a theme provider (navigation, status bar, notifications). */
export function paletteFor(mode: ColorScheme): Colors {
  return (mode === "dark" ? DARK : LIGHT) as Colors;
}

/** React Navigation in the same colours: headers and the tab bar on surface, the screens on background. */
export function navigationTheme(mode: ColorScheme): NavigationTheme {
  const c = paletteFor(mode);
  return {
    dark: mode === "dark",
    colors: {
      primary: c.tint,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.accent,
    },
  };
}
