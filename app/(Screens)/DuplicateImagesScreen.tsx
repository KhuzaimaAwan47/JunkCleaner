import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AppHeader from '../../components/AppHeader';
import DuplicateCard from '../../components/DuplicateCard';
import ProgressBar from '../../components/ProgressBar';
import { useScanner } from '../../context/ScannerContext';
import { duplicateImagesScreenStyles } from '../../styles/screens';
import { DuplicateGroup } from '../../utils/fileScanner';

const {
  Screen,
  Scroll,
  Content,
  StartButton,
  StartButtonText,
  ProgressContainer,
  TimerContainer,
  TimerText,
  FileCountText,
  ErrorContainer,
  ErrorText,
  SummaryCard,
  SummaryTitle,
  SummaryText,
  RescanButton,
  RescanButtonText,
  StopButton,
  StopButtonText,
  ResultsContainer,
  ResultsTitle,
} = duplicateImagesScreenStyles;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function DuplicateImagesScreen() {
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
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <AppHeader title="Duplicate Images Finder" subtitle="Find and manage duplicate image files on your device" />

          {!isScanning && duplicates.length === 0 && (
            <Animated.View style={buttonAnimatedStyle}>
              <StartButton onPress={startScan} activeOpacity={0.8}>
                <StartButtonText>Start Scan</StartButtonText>
              </StartButton>
            </Animated.View>
          )}

          {isScanning && (
            <ProgressContainer>
              <TimerContainer>
                <TimerText>⏱️ {formatTime(elapsedTime)}</TimerText>
                {scannedFiles > 0 && (
                  <FileCountText>
                    {scannedFiles.toLocaleString()} / {totalFiles > 0 ? totalFiles.toLocaleString() : '?'} files
                  </FileCountText>
                )}
              </TimerContainer>
              <ProgressBar
                progress={progressPercent}
                currentFile={progress.currentFile}
                stage={progress.stage}
              />
              <StopButton onPress={stopScan} activeOpacity={0.8}>
                <StopButtonText>Stop</StopButtonText>
              </StopButton>
            </ProgressContainer>
          )}

          {error && (
            <ErrorContainer>
              <ErrorText>{error}</ErrorText>
            </ErrorContainer>
          )}

          {!isScanning && (duplicates.length > 0 || totalDuplicates > 0) && (
            <>
              <SummaryCard>
                <SummaryTitle>Scan Complete</SummaryTitle>
                <SummaryText>
                  Scanned {progress.total || 0} files
                </SummaryText>
                <SummaryText>
                  Found {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} in {duplicates.length} group{duplicates.length !== 1 ? 's' : ''}
                </SummaryText>
                <RescanButton onPress={startScan} activeOpacity={0.8}>
                  <RescanButtonText>Rescan</RescanButtonText>
                </RescanButton>
              </SummaryCard>

              <ResultsContainer>
                <ResultsTitle>Duplicate Groups</ResultsTitle>
                {duplicates.map((group: DuplicateGroup, index: number) => (
                  <DuplicateCard key={`${group.hash}-${index}`} group={group} />
                ))}
              </ResultsContainer>
            </>
          )}

          {!isScanning && duplicates.length === 0 && !error && progress.total > 0 && (
            <SummaryCard>
              {progress.currentFile === 'Cancelled' ? (
                <>
                  <SummaryTitle>Scan Cancelled</SummaryTitle>
                  <SummaryText>
                    Scanned {progress.scannedFiles || progress.current || 0} files before cancellation
                  </SummaryText>
                  <SummaryText>
                    Scan was stopped before completion
                  </SummaryText>
                </>
              ) : (
                <>
                  <SummaryTitle>No Duplicates Found</SummaryTitle>
                  <SummaryText>
                    Scanned {progress.total} files
                  </SummaryText>
                  <SummaryText>
                    All files are unique
                  </SummaryText>
                </>
              )}
              <RescanButton onPress={startScan} activeOpacity={0.8}>
                <RescanButtonText>Rescan</RescanButtonText>
              </RescanButton>
            </SummaryCard>
          )}
        </Content>
      </Scroll>
    </Screen>
  );
}

