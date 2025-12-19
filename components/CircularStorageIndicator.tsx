import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { DefaultTheme, useTheme } from "styled-components/native";

type Props = {
  total: number;
  used: number;
  size?: number;
  label?: string;
  animatedStyle?: ViewStyle;
};

const CircularStorageIndicator: React.FC<Props> = ({ total, used, size = 200, label = "Used", animatedStyle }) => {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, used / total);
  const remaining = total - used;
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const gradientId = React.useMemo(() => `usageGradient-${Math.random().toString(36).slice(2, 9)}`, []);
  const trackColor = `${theme.colors.surfaceAlt}55`;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.95} />
            <Stop offset="100%" stopColor={theme.colors.secondary} stopOpacity={0.9} />
          </SvgGradient>
        </Defs>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={`url(#${gradientId})`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress * circumference}
          strokeLinecap="round"
        />
      </Svg>
      <Animated.View style={[styles.inner, { width: size - 80, height: size - 80 }, animatedStyle]}>
        <Animated.Text style={styles.value}>{used} GB</Animated.Text>
        <Animated.Text style={styles.caption}>{label}</Animated.Text>
        <Animated.Text style={styles.caption}>{remaining.toFixed(1)} GB free</Animated.Text>
      </Animated.View>
    </View>
  );
};

export default CircularStorageIndicator;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
    inner: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
    },
    caption: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
  });
