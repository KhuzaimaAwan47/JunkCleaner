import type { ViewStyle } from "react-native";
import "styled-components";
import "styled-components/native";
import type { DefaultTheme } from "styled-components/native";

export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
};

export const lightPalette: Palette = {
  primary: "#5D5BFF",
  secondary: "#00C7B1",
  accent: "#FF8A7A",
  background: "#F8FAFF",
  surface: "#FFFFFF",
  surfaceAlt: "#E4E9FB",
  text: "#1A1D33",
  textMuted: "#73789D",
  success: "#3CCF8E",
  warning: "#FFBE5E",
};

export const darkPalette: Palette = {
  primary: "#8C7CFF",
  secondary: "#20DFC3",
  accent: "#FF8D92",
  background: "#0F121B",
  surface: "#181C2C",
  surfaceAlt: "#262B3D",
  text: "#F7F8FF",
  textMuted: "#9AA0C0",
  success: "#4BC96A",
  warning: "#FFB347",
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

export type SpacingKey = keyof typeof spacing;

type ThemeMode = "light" | "dark";

type ThemeRadii = {
  lg: number;
  xl: number;
};

type ThemeBlur = {
  sm: number;
  md: number;
};

export type ThemeShape = {
  mode: ThemeMode;
  colors: typeof lightPalette;
  spacing: typeof spacing;
  radii: ThemeRadii;
  blur: ThemeBlur;
};

const baseTheme = {
  spacing,
  radii: {
    lg: 18,
    xl: 28,
  },
  blur: {
    sm: 14,
    md: 24,
  },
};

export const lightTheme: DefaultTheme = {
  mode: "light",
  colors: lightPalette,
  ...baseTheme,
};

export const darkTheme: DefaultTheme = {
  mode: "dark",
  colors: darkPalette,
  ...baseTheme,
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

declare module "styled-components" {
  export interface DefaultTheme extends ThemeShape {
    mode: ThemeMode;
    colors: typeof lightPalette;
    spacing: typeof spacing;
    radii: ThemeRadii;
    blur: ThemeBlur;
  }
}

declare module "styled-components/native" {
  export interface DefaultTheme extends ThemeShape {
    mode: ThemeMode;
    colors: typeof lightPalette;
    spacing: typeof spacing;
    radii: ThemeRadii;
    blur: ThemeBlur;
  }
}

