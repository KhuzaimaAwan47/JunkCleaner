import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DefaultTheme, useTheme } from 'styled-components/native';

interface ProgressBarProps {
  progress: number; // 0-100
  currentFile?: string;
  stage?: string;
}

export default function ProgressBar({ progress, currentFile, stage }: ProgressBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration: 300,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const displayProgress = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>
          {displayProgress.toFixed(1)}%
        </Text>
        {stage && (
          <Text style={styles.stageText}>
            {stage === 'scanning' ? '📁 Scanning files...' : '🔍 Analyzing items...'}
          </Text>
        )}
      </View>
      {currentFile && currentFile !== 'Complete' && currentFile !== 'Scanning directories...' && (
        <Text style={styles.fileText} numberOfLines={1} ellipsizeMode="middle">
          {currentFile}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      padding: theme.spacing.md,
    },
    barContainer: {
      width: '100%',
      height: 12,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      shadowColor: theme.mode === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: theme.mode === 'dark' ? 0.5 : 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.sm,
    },
    infoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xxs,
    },
    text: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textAlign: 'left',
    },
    fileText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    stageText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textAlign: 'right',
      fontWeight: theme.fontWeight.medium,
    },
  });

