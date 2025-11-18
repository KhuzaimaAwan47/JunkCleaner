import 'styled-components';
import 'styled-components/native';
import { lightPalette } from './theme/colors';
import { spacing } from './theme/spacing';

type ThemeMode = 'light' | 'dark';

type ThemeRadii = {
  lg: number;
  xl: number;
};

type ThemeBlur = {
  sm: number;
  md: number;
};

type ThemeShape = {
  mode: ThemeMode;
  colors: typeof lightPalette;
  spacing: typeof spacing;
  radii: ThemeRadii;
  blur: ThemeBlur;
};

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends ThemeShape {}
}

declare module 'styled-components/native' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends ThemeShape {}
}

