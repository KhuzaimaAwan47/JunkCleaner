import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import DebouncedTouchableOpacity from "./DebouncedTouchableOpacity";

type Props = {
  children: ReactNode;
  glass?: boolean;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const NeumorphicContainer: React.FC<Props> = ({
  children,
  glass,
  padding,
  onPress,
  style,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const shadowStyle = useMemo(
    () => ({
      shadowColor: theme.mode === 'dark' ? '#05070E' : `${theme.colors.surfaceAlt}aa`,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: glass ? 0.3 : 0.45,
      shadowRadius: glass ? 18 : 24,
      elevation: glass ? 8 : 14,
    }),
    [glass, theme.colors.surfaceAlt, theme.mode],
  );

  const gradientColors =
    theme.mode === 'dark'
      ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']
      : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)'];

  const ContainerComponent = onPress ? DebouncedTouchableOpacity : View;

  const pressableProps = onPress
    ? {
        onPress,
        disabled: false,
        activeOpacity: 0.9,
      }
    : {};

  return (
    <ContainerComponent
      {...pressableProps}
      style={[
        styles.base,
        {
          padding: padding ?? theme.spacing.lg,
          backgroundColor: glass ? `${theme.colors.surface}11` : theme.colors.surface,
          borderWidth: glass ? 1 : 0,
        },
        shadowStyle,
        style,
      ]}
    >
      {glass ? (
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassOverlay}
        >
          <View style={styles.content}>{children}</View>
        </LinearGradient>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </ContainerComponent>
  );
};

export default NeumorphicContainer;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    base: {
      borderRadius: theme.radii.xl,
      borderColor: `${theme.colors.surfaceAlt}66`,
      overflow: "hidden",
    },
    glassOverlay: {
      flex: 1,
      borderRadius: theme.radii.xl,
    },
    content: {
      flex: 1,
    },
  });
