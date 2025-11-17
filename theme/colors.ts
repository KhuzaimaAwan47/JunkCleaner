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
  primary: '#6C63FF',
  secondary: '#00BFA6',
  accent: '#FF7A80',
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#E8ECF5',
  text: '#1E1E2F',
  textMuted: '#7B7F9E',
  success: '#5AD678',
  warning: '#FFC75F',
};

export const darkPalette: Palette = {
  primary: '#8C7CFF',
  secondary: '#20DFC3',
  accent: '#FF8D92',
  background: '#0F121B',
  surface: '#181C2C',
  surfaceAlt: '#262B3D',
  text: '#F7F8FF',
  textMuted: '#9AA0C0',
  success: '#4BC96A',
  warning: '#FFB347',
};

