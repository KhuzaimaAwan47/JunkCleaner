import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, } from 'react-native-reanimated';
import AppHeader from '../../../components/AppHeader';
import DuplicateCard, { DuplicateFileItem } from '../../../components/DuplicateCard';
import ProgressBar from '../../../components/ProgressBar';
import { duplicateImagesScreenStyles } from '../../../styles/GlobalStyles';
import { useScanner } from './DuplicateImageScanner';

const {
  Screen,
  Scroll,
  Content,
  SmartFilterControl,
  SmartFilterTextWrap,
  SmartFilterLabel,
  SmartFilterSwitch,
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
  SelectRow,
  SelectAllButton,
  SelectAllIndicator,
  SelectAllIndicatorInner,
  SelectAllText,
  ResultsContainer,
  ListEmptyState,
  EmptyTitle,
  EmptySubtitle,
  FooterAction,
  FooterActionButton,
  FooterActionText,
  FooterActionSubtext,
} = duplicateImagesScreenStyles;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function guessOriginalPath(files: { path: string }[]): string | null {
  if (!files.length) {
    return null;
  }
  const normalizedKeywords = ['sdcard', 'downloads', 'dcim', 'camera', 'whatsapp'];
  for (const keyword of normalizedKeywords) {
    const match = files.find((file) => file.path.toLowerCase().includes(keyword));
    if (match) {
      return match.path;
    }
  }
  const nonSystem = files.find((file) => !file.path.toLowerCase().includes('android/data'));
  return (nonSystem || files[0]).path;
}

export default function DuplicateImagesScreen() {
  const { isScanning, progress, duplicates, error, startScan, stopScan } = useScanner();
  const pulseScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [smartFiltering, setSmartFiltering] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const smartFilterMemoryRef = useRef<Set<string>>(new Set());
  const selectAllMemoryRef = useRef<Set<string>>(new Set());

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
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
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

  const duplicateFiles = useMemo<DuplicateFileItem[]>(() => {
    return duplicates.flatMap((group) =>
      group.files.map((file, idx) => ({
        id: `${group.hash}-${idx}-${file.path}`,
        path: file.path,
        size: file.size,
        modifiedDate: file.modifiedDate,
        groupHash: group.hash,
      }))
    );
  }, [duplicates]);

  const fileLookupByGroup = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    duplicateFiles.forEach((file) => {
      if (!map.has(file.groupHash)) {
        map.set(file.groupHash, new Map());
      }
      map.get(file.groupHash)!.set(file.path, file.id);
    });
    return map;
  }, [duplicateFiles]);

  const originalFileIds = useMemo(() => {
    const originals = new Set<string>();
    duplicates.forEach((group) => {
      const preferredPath = guessOriginalPath(group.files);
      if (preferredPath) {
        const id = fileLookupByGroup.get(group.hash)?.get(preferredPath);
        if (id) {
          originals.add(id);
        }
      }
    });
    return originals;
  }, [duplicates, fileLookupByGroup]);

  useEffect(() => {
    setSelectedFileIds((prev) => {
      const availableIds = new Set(duplicateFiles.map((file) => file.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [duplicateFiles]);

  const smartFilteredIds = useMemo(() => {
    const autoSelected = new Set<string>();
    duplicateFiles.forEach((file) => {
      if (!originalFileIds.has(file.id)) {
        autoSelected.add(file.id);
      }
    });
    return autoSelected;
  }, [duplicateFiles, originalFileIds]);

  useEffect(() => {
    if (!smartFiltering) {
      return;
    }
    setSelectedFileIds(new Set(smartFilteredIds));
  }, [smartFiltering, smartFilteredIds]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressPercent = progress.total > 0
    ? Math.min(100, (progress.current / progress.total) * 100)
    : 0;

  const totalDuplicates = duplicateFiles.length;
  const scannedFiles = progress.scannedFiles ?? progress.current;
  const totalFiles = progress.totalFiles ?? progress.total;

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    duplicateFiles.forEach((file) => {
      if (selectedFileIds.has(file.id)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [selectedFileIds, duplicateFiles]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const toggleFileSelection = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSmartFilteringToggle = (value: boolean) => {
    if (value) {
      smartFilterMemoryRef.current = new Set(selectedFileIds);
    } else {
      const previous = smartFilterMemoryRef.current;
      setSelectedFileIds(previous.size ? new Set(previous) : new Set());
      smartFilterMemoryRef.current = new Set();
    }
    selectAllMemoryRef.current = new Set();
    setSmartFiltering(value);
  };

  const handleSelectAll = () => {
    if (!duplicateFiles.length) {
      return;
    }

    if (selectedFileIds.size === duplicateFiles.length) {
      const previous = selectAllMemoryRef.current;
      setSelectedFileIds(previous.size ? new Set(previous) : new Set());
      selectAllMemoryRef.current = new Set();
      return;
    }

    selectAllMemoryRef.current = new Set(selectedFileIds);
    setSelectedFileIds(new Set(duplicateFiles.map((file) => file.id)));
  };

  const deleteDisabled = selectedStats.items === 0;
  const allSelected = duplicateFiles.length > 0 && selectedFileIds.size === duplicateFiles.length;
  const noneSelected = selectedFileIds.size === 0;
  const selectionState: 'all' | 'partial' | 'none' = allSelected ? 'all' : noneSelected ? 'none' : 'partial';
  const selectAllActionLabel = allSelected ? 'restore selection' : 'select all';

  return (
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <AppHeader title="Duplicate Images" subtitle="Review and clean identical photos quickly" />

          <SmartFilterControl>
            <SmartFilterTextWrap>
              <SmartFilterLabel>Smart filtering</SmartFilterLabel>
            </SmartFilterTextWrap>
            <SmartFilterSwitch value={smartFiltering} onValueChange={handleSmartFilteringToggle} />
          </SmartFilterControl>

          {!isScanning && duplicateFiles.length === 0 && (
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

          {!isScanning && (duplicateFiles.length > 0 || totalDuplicates > 0) && (
            <>
              <SelectRow>
                <SelectAllButton onPress={handleSelectAll}>
                  <SelectAllIndicator state={selectionState}>
                    {selectionState === 'all' ? (
                      <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
                    ) : (
                      <SelectAllIndicatorInner state={selectionState} />
                    )}
                  </SelectAllIndicator>
                  <SelectAllText>{selectAllActionLabel}</SelectAllText>
                </SelectAllButton>
              </SelectRow>

              <ResultsContainer>
                {duplicateFiles.map((file: DuplicateFileItem) => (
                  <DuplicateCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileIds.has(file.id)}
                    onToggleSelect={() => toggleFileSelection(file.id)}
                  />
                ))}
              </ResultsContainer>
            </>
          )}

          {!isScanning && duplicateFiles.length === 0 && !error && progress.total > 0 && (
            <SummaryCard>
              {progress.currentFile === 'Cancelled' ? (
                <>
                  <SummaryTitle>Scan Cancelled</SummaryTitle>
                  <SummaryText>
                    Scanned {progress.scannedFiles || progress.current || 0} files before cancellation.
                  </SummaryText>
                </>
              ) : (
                <>
                  <SummaryTitle>No Duplicates Found</SummaryTitle>
                  <SummaryText>
                    Scanned {progress.total} files. All files are unique.
                  </SummaryText>
                </>
              )}
              <RescanButton onPress={startScan} activeOpacity={0.8}>
                <RescanButtonText>Rescan</RescanButtonText>
              </RescanButton>
            </SummaryCard>
          )}

          {!isScanning && duplicateFiles.length === 0 && !error && progress.total === 0 && (
            <ListEmptyState>
              <EmptyTitle>No duplicate images yet</EmptyTitle>
              <EmptySubtitle>
                Start a scan to find identical photos and free up storage space.
              </EmptySubtitle>
            </ListEmptyState>
          )}

          {!isScanning && duplicateFiles.length > 0 && (
            <FooterAction>
              <FooterActionButton
                disabled={deleteDisabled}
                activeOpacity={deleteDisabled ? 1 : 0.9}
              >
                <FooterActionText>
                  delete {selectedStats.items} item{selectedStats.items !== 1 ? 's' : ''}
                </FooterActionText>
                <FooterActionSubtext>{formatBytes(selectedStats.size)}</FooterActionSubtext>
              </FooterActionButton>
            </FooterAction>
          )}
        </Content>
      </Scroll>
    </Screen>
  );
}

