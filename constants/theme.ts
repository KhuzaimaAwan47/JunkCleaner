import { darkPalette, lightPalette } from "../theme/colors";

export const palette = {
  accent: "#F06292",
  background: "#0a0f0a",
  card: "#181C2C",
  border: "rgba(255,255,255,0.12)",
  surface: "#262B3D",
  textPrimary: "#F7F8FF",
  textSecondary: "#9AA0C0",
};

export const layout = {
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  cardRadius: 16,
  cardPadding: 16,
};

export const typography = {
  subheading: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    letterSpacing: 0.4,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    letterSpacing: 0.2,
  },
};

