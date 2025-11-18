import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';
import { useScanner } from '../../context/ScannerContext';
import { appRoutes } from '../../routes';
import { DuplicateGroup } from '../../utils/fileScanner';

const neumorphicStyles = {
  shadowColorLight: 'rgba(255, 255, 255, 0.1)',
  shadowColorDark: 'rgba(0, 0, 0, 0.5)',
  backgroundColor: '#1a1a1a',
  cardBackground: '#2d2d2d',
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function DuplicateImagesScreen() {
  const router = useRouter();
  const { isScanning, progress, duplicates, error, startScan, stopScan } = useScanner();
  const pulseScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isScanning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
      // Start timer
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isScanning, pulseScale]);

  useEffect(() => {
    if (!isScanning && duplicates.length > 0) {
      // Navigate to results after a short delay
      setTimeout(() => {
        router.push(appRoutes.resultAnimation as any);
      }, 500);
    }
  }, [isScanning, duplicates.length, router]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressPercent = progress.total > 0
    ? Math.min(100, (progress.current / progress.total) * 100)
    : 0;

  const totalDuplicates = duplicates.reduce((sum: number, group: DuplicateGroup) => sum + group.files.length, 0);
  
  // Get file count info
  const scannedFiles = progress.scannedFiles ?? progress.current;
  const totalFiles = progress.totalFiles ?? progress.total;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Duplicate Images Finder</Text>
          <Text style={styles.subtitle}>
            Find and manage duplicate image files on your device
          </Text>

          {!isScanning && duplicates.length === 0 && (
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={startScan}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Scan</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {isScanning && (
            <View style={styles.progressContainer}>
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>⏱️ {formatTime(elapsedTime)}</Text>
                {scannedFiles > 0 && (
                  <Text style={styles.fileCountText}>
                    {scannedFiles.toLocaleString()} / {totalFiles > 0 ? totalFiles.toLocaleString() : '?'} files
                  </Text>
                )}
              </View>
              <ProgressBar
                progress={progressPercent}
                currentFile={progress.currentFile}
                stage={progress.stage}
              />
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopScan}
                activeOpacity={0.8}
              >
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!isScanning && (duplicates.length > 0 || totalDuplicates > 0) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Scan Complete</Text>
              <Text style={styles.summaryText}>
                Scanned {progress.total || 0} files
              </Text>
              <Text style={styles.summaryText}>
                Found {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} in {duplicates.length} group{duplicates.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={styles.viewResultsButton}
                onPress={() => router.push(appRoutes.resultAnimation as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewResultsButtonText}>View Results</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={startScan}
                activeOpacity={0.8}
              >
                <Text style={styles.rescanButtonText}>Rescan</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isScanning && duplicates.length === 0 && !error && progress.total > 0 && (
            <View style={styles.summaryCard}>
              {progress.currentFile === 'Cancelled' ? (
                <>
                  <Text style={styles.summaryTitle}>Scan Cancelled</Text>
                  <Text style={styles.summaryText}>
                    Scanned {progress.scannedFiles || progress.current || 0} files before cancellation
                  </Text>
                  <Text style={styles.summaryText}>
                    Scan was stopped before completion
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.summaryTitle}>No Duplicates Found</Text>
                  <Text style={styles.summaryText}>
                    Scanned {progress.total} files
                  </Text>
                  <Text style={styles.summaryText}>
                    All files are unique
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={startScan}
                activeOpacity={0.8}
              >
                <Text style={styles.rescanButtonText}>Rescan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neumorphicStyles.backgroundColor,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    marginBottom: 48,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: neumorphicStyles.cardBackground,
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 20,
    shadowColor: neumorphicStyles.shadowColorDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  startButtonText: {
    color: '#4a9eff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 32,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timerText: {
    color: '#4a9eff',
    fontSize: 18,
    fontWeight: '700',
  },
  fileCountText: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#3a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: neumorphicStyles.cardBackground,
    padding: 24,
    borderRadius: 16,
    marginTop: 32,
    width: '100%',
    shadowColor: neumorphicStyles.shadowColorDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#aaaaaa',
    marginBottom: 8,
    textAlign: 'center',
  },
  viewResultsButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: neumorphicStyles.shadowColorDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewResultsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  rescanButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a9eff',
  },
  rescanButtonText: {
    color: '#4a9eff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stopButton: {
    marginTop: 16,
    backgroundColor: '#ff4d4d',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
