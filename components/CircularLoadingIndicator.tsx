import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { SmartScanProgress } from "../utils/smartScan";
import type { SystemHealthResult } from "../utils/systemHealth";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  scanProgress?: SmartScanProgress | null;
  systemHealth?: SystemHealthResult | null;
  size?: number;
};

const CircularLoadingIndicator: React.FC<Props> = ({ scanProgress, systemHealth, size = 200 }) => {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const lottieRef = React.useRef<LottieView>(null);
  const animatedProgress = useSharedValue(0);

  // Start/stop animation based on scan progress
  React.useEffect(() => {
    if (scanProgress) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.pause();
    }
  }, [scanProgress]);

  // Animate system health progress
  React.useEffect(() => {
    if (systemHealth && !scanProgress) {
      const progress = systemHealth.score / 100;
      animatedProgress.value = withTiming(progress, {
        duration: 800,
      });
    }
  }, [systemHealth, scanProgress, animatedProgress]);

  // Get health status color
  const getHealthColor = (status?: SystemHealthResult['status']): string => {
    if (!status) return theme.colors.textMuted;
    switch (status) {
      case 'excellent':
        return theme.colors.success || '#4CAF50';
      case 'good':
        return theme.colors.primary;
      case 'fair':
        return theme.colors.warning || '#FF9800';
      case 'poor':
        return theme.colors.error || '#F44336';
      default:
        return theme.colors.textMuted;
    }
  };

  // Animated props for the health circle
  const animatedCircleProps = useAnimatedProps(() => {
    const progressValue = animatedProgress.value;
    return {
      strokeDashoffset: circumference - progressValue * circumference,
    };
  });

  const healthColor = systemHealth ? getHealthColor(systemHealth.status) : theme.colors.textMuted;
  const trackColor = `${theme.colors.surfaceAlt}55`;


  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {scanProgress ? (
        <LottieView
          ref={lottieRef}
          source={require("../assets/lottie/loading_circle.json")}
          style={{ width: size, height: size }}
          autoPlay
          loop
        />
      ) : systemHealth ? (
        <>
          <Svg width={size} height={size}>
            <Circle
              stroke={trackColor}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <AnimatedCircle
              stroke={healthColor}
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
          <View style={[styles.inner, { width: size - 80, height: size - 80 }]}>
            <Text style={styles.statusText}>System Health</Text>
            <Text style={[styles.scoreText, { color: healthColor }]}>
              {systemHealth.score}
            </Text>
            <Text
              style={[
                styles.statusSubtext,
                { color: healthColor },
              ]}
            >
              {systemHealth?.message ?? 'not calculated yet'}
            </Text>
          </View>
        </>
      ) : (
        <View style={[styles.inner, { width: size - 80, height: size - 80 }]}>
          <Text style={styles.statusText}>System Health</Text>
          <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>
            --
          </Text>
          <Text style={[styles.statusSubtext, { color: theme.colors.textMuted }]}>
            Not calculated yet
          </Text>
        </View>
      )}
    </View>
  );
};

export default CircularLoadingIndicator;

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
    statusText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    scoreText: {
      fontSize: 32,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 4,
    },
    statusSubtext: {
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
    },
  });

