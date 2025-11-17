import 'styled-components';
import { lightPalette } from './theme/colors';
import { spacing } from './theme/spacing';

declare module 'styled-components' {
  export interface DefaultTheme {
    mode: 'light' | 'dark';
    colors: typeof lightPalette;
    spacing: typeof spacing;
    radii: {
      lg: number;
      xl: number;
    };
    blur: {
      sm: number;
      md: number;
    };
  }
}

