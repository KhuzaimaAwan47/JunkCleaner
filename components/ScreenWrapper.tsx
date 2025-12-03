import React from 'react';
import { StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import { useTheme } from 'styled-components/native';

import { useThemeColor } from '../theme/theme';

export type ScreenWrapperProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export type ScreenTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export type ScreenViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

type ScreenWrapperComponent = React.FC<ScreenWrapperProps> & {
  Text: React.FC<ScreenTextProps>;
  View: React.FC<ScreenViewProps>;
};

const BaseScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, style, lightColor, darkColor, ...rest }) => {
  const theme = useTheme();
  const themeBackgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const backgroundColor = lightColor || darkColor 
    ? themeBackgroundColor
    : theme.colors.background;

  return (
    <View style={[styles.container, { backgroundColor }, style]} {...rest}>
      {children}
    </View>
  );
};

const ScreenText: React.FC<ScreenTextProps> = ({ style, lightColor, darkColor, type = 'default', ...rest }) => {
  const theme = useTheme();
  const themeTextColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  let color: string;
  
  if (lightColor || darkColor) {
    color = themeTextColor;
  } else if (type === 'link') {
    // Use primary color for links, which works well in both themes
    color = theme.colors.primary;
  } else {
    color = theme.colors.text;
  }

  return (
    <Text
      style={[
        { color },
        type === 'default' ? textStyles.default : undefined,
        type === 'title' ? textStyles.title : undefined,
        type === 'defaultSemiBold' ? textStyles.defaultSemiBold : undefined,
        type === 'subtitle' ? textStyles.subtitle : undefined,
        type === 'link' ? textStyles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
};

const ScreenView: React.FC<ScreenViewProps> = ({ style, lightColor, darkColor, ...otherProps }) => {
  const theme = useTheme();
  const themeBackgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const backgroundColor = lightColor || darkColor
    ? themeBackgroundColor
    : theme.colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const textStyles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    // Color is now set dynamically via theme in ScreenText component
  },
});

const ScreenWrapper = BaseScreenWrapper as ScreenWrapperComponent;

ScreenWrapper.Text = ScreenText;
ScreenWrapper.View = ScreenView;

export { ScreenText, ScreenView };
export default ScreenWrapper;
