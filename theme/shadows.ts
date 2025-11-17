import { ViewStyle } from 'react-native';

type ShadowSet = {
  soft: ViewStyle;
  inset: ViewStyle;
};

export const neumorphicShadows = (isDark: boolean): ShadowSet => {
  const highlight = isDark ? '#1F2435' : '#FFFFFF';
  const lowlight = isDark ? '#060812' : '#C7CFDE';

  return {
    soft: {
      shadowColor: lowlight,
      shadowOffset: { width: 8, height: 8 },
      shadowOpacity: 0.35,
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

