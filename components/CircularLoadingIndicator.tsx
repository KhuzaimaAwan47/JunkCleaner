import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { SmartScanProgress } from "../utils/smartScan";
import type { SystemHealthResult } from "../utils/systemHealth";

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

  // Calculate progress based on scan
  const progress = scanProgress
    ? Math.min(1, (scanProgress.current + (scanProgress.scannerProgress || 0)) / scanProgress.total)
    : 0;

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
              {systemHealth?.message ?? 'No Data'}
            </Text>
            {systemHealth?.score != null && (
              <Text style={styles.healthScore}>
                {systemHealth.score}/100
              </Text>
            )}
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
    healthScore: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 4,
      opacity: 0.7,
    },
  });

