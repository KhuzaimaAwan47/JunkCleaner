import { DefaultTheme } from 'styled-components/native';
import { darkPalette, lightPalette } from './colors';
import { spacing } from './spacing';

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
  mode: 'light',
  colors: lightPalette,
  ...baseTheme,
};

export const darkTheme: DefaultTheme = {
  mode: 'dark',
  colors: darkPalette,
  ...baseTheme,
};

