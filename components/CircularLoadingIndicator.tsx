import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedProps, withTiming } from "react-native-reanimated";
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
  const gradientId = React.useMemo(() => `loadingGradient-${Math.random().toString(36).slice(2, 9)}`, []);
  const trackColor = `${theme.colors.surfaceAlt}55`;

  // Animated progress value with monotonic tracking
  const animatedProgress = useSharedValue(0);
  const maxProgressRef = React.useRef(0);
  const previousScanningRef = React.useRef(false);

  // Calculate progress based on scan or system health
  const calculateProgress = React.useCallback(() => {
    if (scanProgress) {
      // Calculate progress: (completedScanners + currentScannerProgress) / totalScanners
      const completedScanners = scanProgress.current;
      const currentScannerProgress = Math.max(0, Math.min(1, scanProgress.scannerProgress || 0));
      return Math.min(1, (completedScanners + currentScannerProgress) / scanProgress.total);
    } else if (systemHealth) {
      return systemHealth.score / 100;
    }
    return 0;
  }, [scanProgress, systemHealth]);

  // Update animated progress with monotonic guarantee
  React.useEffect(() => {
    const isScanning = scanProgress !== null;
    const wasScanning = previousScanningRef.current;
    
    // Reset when a new scan starts (transition from not scanning to scanning)
    if (isScanning && !wasScanning) {
      maxProgressRef.current = 0;
      animatedProgress.value = 0;
    }
    
    previousScanningRef.current = isScanning;
    
    const newProgress = calculateProgress();
    
    if (isScanning) {
      // During scanning: ensure progress never decreases (monotonic)
      const targetProgress = Math.max(maxProgressRef.current, newProgress);
      maxProgressRef.current = targetProgress;
      
      // Animate to new progress value smoothly
      animatedProgress.value = withTiming(targetProgress, {
        duration: 400, // Smooth animation duration
      });
    } else {
      // When not scanning (showing system health): use calculated progress directly
      animatedProgress.value = withTiming(newProgress, {
        duration: 400,
      });
    }
  }, [scanProgress, systemHealth, calculateProgress, animatedProgress]);

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

  // Determine stroke color - use health color if showing system health, otherwise use gradient
  const strokeColor = systemHealth && !scanProgress
    ? getHealthColor(systemHealth.status)
    : `url(#${gradientId})`;

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => {
    const progressValue = animatedProgress.value;
    return {
      strokeDashoffset: circumference - progressValue * circumference,
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
          stroke={strokeColor}
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
        {scanProgress ? (
          <>
            <Text style={styles.scannerName} numberOfLines={1}>
              {scanProgress.scannerName}
            </Text>
            <Text style={styles.progressText}>
              {scanProgress.current}/{scanProgress.total}
            </Text>
            {scanProgress.scannerDetail && (
              <Text style={styles.detailText} numberOfLines={2}>
                {scanProgress.scannerDetail}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.statusText}>System Health</Text>
            <Text
              style={[
                styles.statusSubtext,
                { color: getHealthColor(systemHealth?.status) },
              ]}
            >
              {systemHealth?.message ?? 'not calculated yet'}
            </Text>
          </>
        )}
      </View>
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
    scannerName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    progressText: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: 4,
    },
    detailText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    statusText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    statusSubtext: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textMuted,
      textAlign: "center",
    },
  });

