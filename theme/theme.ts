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
  textMuted: "#525252", // Improved contrast: changed from #6B7280 to meet WCAG AA (4.5:1)
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
  errorLight: "#FEE2E2", // Light variant for error backgrounds
  errorDark: "#DC2626", // Darker variant for error emphasis
  info: "#3B82F6",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#E8EAED",
  border: "#E0E0E0",
  divider: "#E5E5E5", // Dedicated divider color
  overlay: "rgba(0, 0, 0, 0.5)", // Overlay for modals
};

export const darkColors = {
  primary: "#5AC8FA",
  primaryDark: "#3BA3D8",
  primaryLight: "#7DD3FF",
  secondary: "#34D399",
  accent: "#FB923C",
  text: "#F5F5F5",
  textMuted: "#D4D4D4", // Improved contrast: changed from #A1A1AA to meet WCAG AA (4.5:1)
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
  errorLight: "#7F1D1D", // Dark variant for error backgrounds
  errorDark: "#FCA5A5", // Lighter variant for error emphasis in dark mode
  info: "#3B82F6",
  background: "#171717",
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  border: "#3A3A3C",
  divider: "#404040", // Dedicated divider color for dark mode
  overlay: "rgba(0, 0, 0, 0.7)", // Overlay for modals in dark mode
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
  xs: 8, // Refined from 10 for better granularity
  sm: 12, // Refined from 15 for better granularity
  md: 16, // Refined from 20 for better granularity
  lg: spacingX._20,
  xl: spacingX._25,
  xxl: spacingX._30,
  xxxl: 40, // Added for larger gaps
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

// Line heights ---------------------------------------------------------------

export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 36,
  xxxl: 40,
};

// Theme factory ------------------------------------------------------------

const baseTheme = {
  spacing,
  radii,
  fontSize,
  fontWeight,
  lineHeight,
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

// Opacity utility ----------------------------------------------------------

/**
 * Converts a hex color to rgba format with specified opacity
 * @param color - Hex color string (with or without #)
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string
 */
export function withOpacity(color: string, opacity: number): string {
  // Remove # if present
  const hex = color.replace("#", "");
  
  // Handle 3-digit hex colors
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // Handle 6-digit hex colors
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // If already rgba, return as is
  if (color.startsWith("rgba")) {
    return color;
  }
  
  // Fallback
  return color;
}

// Shadow system ----------------------------------------------------------

type ShadowPreset = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const shadows = {
  sm: (isDark: boolean): ShadowPreset => ({
    shadowColor: isDark ? "#000000" : "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: 2,
  }),
  md: (isDark: boolean): ShadowPreset => ({
    shadowColor: isDark ? "#000000" : "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.15,
    shadowRadius: 4,
    elevation: 4,
  }),
  lg: (isDark: boolean): ShadowPreset => ({
    shadowColor: isDark ? "#000000" : "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.2,
    shadowRadius: 8,
    elevation: 8,
  }),
  xl: (isDark: boolean): ShadowPreset => ({
    shadowColor: isDark ? "#000000" : "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.6 : 0.25,
    shadowRadius: 16,
    elevation: 12,
  }),
};

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
    lineHeight: typeof lineHeight;
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
    lineHeight: typeof lineHeight;
  }
}

