import 'styled-components';
import 'styled-components/native';
import { lightPalette } from './colors';
import { spacing } from './spacing';

type ThemeMode = 'light' | 'dark';

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

declare module 'styled-components' {
  // Augment styled-components' inferred theme with our strongly typed shape
  export interface DefaultTheme extends ThemeShape {
    mode: ThemeMode;
    colors: typeof lightPalette;
    spacing: typeof spacing;
    radii: ThemeRadii;
    blur: ThemeBlur;
  }
}

declare module 'styled-components/native' {
  export interface DefaultTheme extends ThemeShape {
    mode: ThemeMode;
    colors: typeof lightPalette;
    spacing: typeof spacing;
    radii: ThemeRadii;
    blur: ThemeBlur;
  }
}


