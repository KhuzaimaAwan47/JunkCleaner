import { useEffect, useState } from "react";
import type { ViewStyle } from "react-native";
import { Platform, useColorScheme as useRNColorScheme } from "react-native";
import "styled-components";
import "styled-components/native";
import type { DefaultTheme } from "styled-components/native";

// Color palette ------------------------------------------------------------

export const allColors = {
  primary: "#007AFF",
  primaryDark: "#0056CC",
  primaryLight: "#4DA6FF",
  secondary: "#10B981",
  accent: "#F97316",
  text: "#171717",
  textMuted: "#6B7280",
  black: "#000000",
  white: "#FFFFFF",
  grey: "#666666",
  neutral50: "#FAFAFA",
  neutral100: "#F5F5F5",
  neutral200: "#E5E5E5",
  neutral300: "#D4D4D4",
  neutral400: "#A3A3A3",
  neutral500: "#737373",
  neutral600: "#525252",
  neutral700: "#404040",
  neutral800: "#262626",
  neutral900: "#171717",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#E8EAED",
  border: "#E0E0E0",
};

export const darkColors = {
  primary: "#5AC8FA",
  primaryDark: "#3BA3D8",
  primaryLight: "#7DD3FF",
  secondary: "#34D399",
  accent: "#FB923C",
  text: "#F5F5F5",
  textMuted: "#A1A1AA",
  black: "#FFFFFF",
  white: "#000000",
  grey: "#999999",
  neutral50: "#171717",
  neutral100: "#262626",
  neutral200: "#404040",
  neutral300: "#525252",
  neutral400: "#737373",
  neutral500: "#A3A3A3",
  neutral600: "#D4D4D4",
  neutral700: "#E5E5E5",
  neutral800: "#F5F5F5",
  neutral900: "#FAFAFA",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  background: "#171717",
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  border: "#3A3A3C",
};

export const Colors = {
  light: {
    text: allColors.text,
    background: allColors.background,
    tint: allColors.primary,
    tabIconDefault: allColors.neutral400,
    tabIconSelected: allColors.primary,
  },
  dark: {
    text: darkColors.text,
    background: darkColors.background,
    tint: darkColors.primary,
    tabIconDefault: darkColors.neutral400,
    tabIconSelected: darkColors.primary,
  },
} as const;

export type ThemeMode = keyof typeof Colors;

const DEFAULT_THEME: ThemeMode = "light";
const isWeb = Platform.OS === "web";

// Spacing system -----------------------------------------------------------

export const spacingX = {
  _5: 5,
  _10: 10,
  _15: 15,
  _20: 20,
  _25: 25,
  _30: 30,
};

export const spacingY = { ...spacingX };

export const spacing = {
  xxs: 4,
  xs: spacingX._10,
  sm: spacingX._15,
  md: spacingX._20,
  lg: spacingX._25,
  xl: spacingX._30,
};

export type SpacingKey = keyof typeof spacing;

// Border radius -----------------------------------------------------------

export const radius = {
  _5: 5,
  _10: 10,
  _15: 15,
  _20: 20,
  _25: 25,
  _30: 30,
  _50: 50,
};

const radii = {
  sm: radius._10,
  md: radius._15,
  lg: radius._20,
  xl: radius._30,
  pill: radius._50,
};

// Typography ---------------------------------------------------------------

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  light: "300" as const,
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

// Theme factory ------------------------------------------------------------

const baseTheme = {
  spacing,
  radii,
  fontSize,
  fontWeight,
};

const buildTheme = (mode: ThemeMode): DefaultTheme => ({
  mode,
  colors: mode === "dark" ? darkColors : allColors,
  ...baseTheme,
});

export const lightTheme = buildTheme("light");
export const darkTheme = buildTheme("dark");

// Theme utilities ---------------------------------------------------------

export const getThemeColors = (theme: ThemeMode) => {
  return theme === "dark" ? darkColors : allColors;
};

export function useAppColorScheme(): ThemeMode {
  const colorScheme = useRNColorScheme() as ThemeMode | null;
  const [hasHydrated, setHasHydrated] = useState(!isWeb);

  useEffect(() => {
    if (isWeb) {
      setHasHydrated(true);
    }
  }, []);

  if (!hasHydrated) {
    return DEFAULT_THEME;
  }

  return colorScheme ?? DEFAULT_THEME;
}

type ThemeColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName,
) {
  const theme = useAppColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}

// Shared shadows ----------------------------------------------------------

type ShadowSet = {
  soft: ViewStyle;
  inset: ViewStyle;
};

export const neumorphicShadows = (isDark: boolean): ShadowSet => {
  const highlight = isDark ? "#1F2435" : "#FFFFFF";
  const lowlight = isDark ? "#060812" : "#C0C8EB";

  return {
    soft: {
      shadowColor: lowlight,
      shadowOffset: { width: 8, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.3,
      shadowRadius: 18,
      elevation: 12,
    },
    inset: {
      shadowColor: highlight,
      shadowOffset: { width: -6, height: -6 },
      shadowOpacity: 0.7,
      shadowRadius: 14,
    },
  };
};

// Styled-components theme typing -----------------------------------------

declare module "styled-components" {
  export interface DefaultTheme {
    mode: ThemeMode;
    colors: typeof allColors | typeof darkColors;
    spacing: typeof spacing;
    radii: typeof radii;
    fontSize: typeof fontSize;
    fontWeight: typeof fontWeight;
  }
}

declare module "styled-components/native" {
  export interface DefaultTheme {
    mode: ThemeMode;
    colors: typeof allColors | typeof darkColors;
    spacing: typeof spacing;
    radii: typeof radii;
    fontSize: typeof fontSize;
    fontWeight: typeof fontWeight;
  }
}

