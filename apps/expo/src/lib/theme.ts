import { defaultSpacing } from "@rneui/base";
import { Colors, createTheme, CreateThemeOptions } from "@rneui/themed";
import { Theme as NavigationTheme } from "@react-navigation/native";

import brandFile from "../../brand.json";

/**
 * "Volt": the energiegedrag.nl look. Electric blue with a cyan spark on midnight blue, as the element tile 'Eg'
 * of the icon. All colours come from brand.json, the one place for a deployment's brand (see BRANDING.md).
 *
 * Contrast (WCAG): text on background and surface >= 4.5 in both modes, white text on primary, success and error
 * >= 4.5 in light mode and on primary and error in dark mode; muted text >= 4.5 everywhere.
 */
export const BRAND = {
  /** Midnight blue: splash, icon background, the dark backdrop. */
  midnight: brandFile.brand.backdrop,
  /** The middle of the backdrop gradient. */
  deep: brandFile.brand.deep,
  /** Electric blue: the brand colour. */
  volt: brandFile.brand.primary,
  /** Cyan spark: highlights and the end of the gradient. */
  spark: brandFile.brand.accent,
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

const LIGHT: Partial<Colors> = brandFile.light;

const DARK: Partial<Colors> = brandFile.dark;

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
