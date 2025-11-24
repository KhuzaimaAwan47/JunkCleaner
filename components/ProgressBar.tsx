import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number; // 0-100
  currentFile?: string;
  stage?: string;
}

const neumorphicStyles = {
  shadowColorLight: 'rgba(255, 255, 255, 0.1)',
  shadowColorDark: 'rgba(0, 0, 0, 0.5)',
  backgroundColor: '#2d2d2d',
};

export default function ProgressBar({ progress, currentFile, stage }: ProgressBarProps) {
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  barContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: neumorphicStyles.shadowColorDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 3,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4a9eff',
    borderRadius: 6,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  fileText: {
    color: '#aaaaaa',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  stageText: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
});

