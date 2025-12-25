import React, { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { DefaultTheme, useTheme } from "styled-components/native";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const gradientId = React.useMemo(() => `usageGradient-${Math.random().toString(36).slice(2, 9)}`, []);
  const trackColor = `${theme.colors.surfaceAlt}55`;

  // Animation values
  const animatedUsed = useSharedValue(0);
  const animatedTotal = useSharedValue(0);
  const animatedProgress = useSharedValue(0);

  // State for displaying animated text
  const [displayText, setDisplayText] = useState("0/0GB");

  // Round to whole numbers for display to match phone manager format
  const roundedUsed = Math.round(used);
  const roundedTotal = Math.round(total);

  useEffect(() => {
    // Animate values from 0 to actual values
    animatedUsed.value = withTiming(roundedUsed, {
      duration: 1000,
      easing: Easing.out(Easing.ease),
    });
    animatedTotal.value = withTiming(roundedTotal, {
      duration: 1000,
      easing: Easing.out(Easing.ease),
    });
    
    // Calculate and animate progress
    const progress = Math.min(1, used / total);
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.ease),
    });
  }, [roundedUsed, roundedTotal, used, total, animatedUsed, animatedTotal, animatedProgress]);

  // Update display text based on animated values
  useAnimatedReaction(
    () => ({
      used: Math.round(animatedUsed.value),
      total: Math.round(animatedTotal.value),
    }),
    (current) => {
      runOnJS(setDisplayText)(`${current.used}/${current.total}GB`);
    }
  );

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => {
    const dashOffset = circumference - animatedProgress.value * circumference;
    return {
      strokeDashoffset: dashOffset,
    };
  });

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
        <AnimatedCircle
          stroke={`url(#${gradientId})`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          animatedProps={animatedCircleProps}
        />
      </Svg>
      <Animated.View style={[styles.inner, { width: size - 80, height: size - 80 }, animatedStyle]}>
        <Animated.Text style={styles.value}>
          {displayText}
        </Animated.Text>
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
