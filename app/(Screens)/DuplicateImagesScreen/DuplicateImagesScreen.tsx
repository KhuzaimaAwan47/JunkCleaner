import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, useTheme } from 'styled-components/native';
import AppHeader from '../../../components/AppHeader';
import DeleteButton from '../../../components/DeleteButton';
import { DuplicateFileItem } from '../../../components/DuplicateCard';
import ProgressBar from '../../../components/ProgressBar';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { useScanner } from './DuplicateImageScanner';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  if (isNaN(date.getTime())) return 'unknown date';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

function getFileSource(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('whatsapp')) return 'From:WhatsApp';
  if (lowerPath.includes('android')) return 'From:Android';
  if (lowerPath.includes('dcim') || lowerPath.includes('camera')) return 'From:Camera';
  if (lowerPath.includes('downloads')) return 'From:Downloads';
  return 'From:Android';
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

function ensurePreviewUri(path: string): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('data:')) {
    return path;
  }
  return `file://${path}`;
}

export default function DuplicateImagesScreen() {
  const { isScanning, isRestoring, progress, duplicates, error, startScan, stopScan } = useScanner();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pulseScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [smartFiltering, setSmartFiltering] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [previewFile, setPreviewFile] = useState<DuplicateFileItem | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(() => new Set());
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

  const handleGroupSelectAll = (groupHash: string) => {
    const groupFiles = duplicateFiles.filter((file) => file.groupHash === groupHash);
    const groupFileIds = new Set(groupFiles.map((file) => file.id));
    const allGroupSelected = groupFiles.every((file) => selectedFileIds.has(file.id));

    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) {
        groupFileIds.forEach((id) => next.delete(id));
      } else {
        groupFileIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const deleteDisabled = selectedStats.items === 0;
  const allSelected = duplicateFiles.length > 0 && selectedFileIds.size === duplicateFiles.length;
  const noneSelected = selectedFileIds.size === 0;
  const selectionState: 'all' | 'partial' | 'none' = allSelected ? 'all' : noneSelected ? 'none' : 'partial';
  const selectAllActionLabel = allSelected ? 'restore selection' : 'select all';
  const selectAllDisabled = duplicateFiles.length === 0;
  const selectAllHint = selectAllDisabled
    ? 'run a scan to enable'
    : `${selectedFileIds.size}/${duplicateFiles.length} selected`;
  const previewUri = previewFile ? ensurePreviewUri(previewFile.path) : null;

  const handlePreview = (file: DuplicateFileItem) => {
    setPreviewFile(file);
  };

  const handlePreviewClose = () => {
    setPreviewFile(null);
  };

  const showResults = !isScanning && duplicateFiles.length > 0;
  const showStartButton = !isScanning && !isRestoring && duplicateFiles.length === 0;
  const showNoResultsSummary = !isScanning && !isRestoring && duplicateFiles.length === 0 && !error && progress.total > 0;
  const showEmptyState = !isScanning && !isRestoring && duplicateFiles.length === 0 && !error && progress.total === 0;

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader title="Duplicate Images" subtitle="Review and clean identical photos quickly" />
        </View>
        <View style={styles.stickyFilterContainer}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={handleSelectAll}
              disabled={selectAllDisabled}
              activeOpacity={selectAllDisabled ? 1 : 0.85}
              style={[styles.filterButton, selectAllDisabled && styles.filterButtonDisabled]}
            >
              <View
                style={[
                  styles.selectIndicator,
                  selectionState === 'all' && styles.selectIndicatorAll,
                  selectionState === 'partial' && styles.selectIndicatorPartial,
                ]}
              >
                {selectionState === 'all' ? (
                  <MaterialCommunityIcons name="check" size={14} color={theme.colors.white} />
                ) : (
                  <View
                    style={[
                      styles.selectIndicatorInner,
                      selectionState === 'partial' && styles.selectIndicatorInnerPartial,
                    ]}
                  />
                )}
              </View>
              <View style={styles.filterText}>
                <Text style={styles.filterLabel}>{selectAllActionLabel}</Text>
                <Text style={styles.filterHint}>{selectAllHint}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.smartFilterCard}>
              <View style={styles.smartFilterText}>
                <Text style={styles.smartFilterLabel}>smart filtering</Text>
              </View>
              <Switch
                value={smartFiltering}
                onValueChange={handleSmartFilteringToggle}
                trackColor={{ false: `${theme.colors.surfaceAlt}55`, true: `${theme.colors.primary}55` }}
                thumbColor={theme.colors.primary}
              />
            </View>
          </View>
        </View>
         <ScrollView 
           contentContainerStyle={[
             styles.content,
             !isScanning && duplicateFiles.length > 0 && styles.contentWithFixedButton
           ]} 
           showsVerticalScrollIndicator={false}
         >

          {showStartButton && (
          <Animated.View style={[buttonAnimatedStyle, styles.sectionSpacing]}>
            <TouchableOpacity style={styles.primaryButton} onPress={startScan} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>start scan</Text>
            </TouchableOpacity>
            </Animated.View>
          )}

          {isScanning && (
          <View style={[styles.progressCard, styles.sectionSpacing]}>
            <View style={styles.timerRow}>
              <Text style={styles.timerText}>⏱️ {formatTime(elapsedTime)}</Text>
                {scannedFiles > 0 && (
                <Text style={styles.fileCountText}>
                    {scannedFiles.toLocaleString()} / {totalFiles > 0 ? totalFiles.toLocaleString() : '?'} files
                </Text>
              )}
            </View>
            <ProgressBar progress={progressPercent} currentFile={progress.currentFile} stage={progress.stage} />
            <TouchableOpacity style={styles.stopButton} onPress={stopScan} activeOpacity={0.8}>
              <Text style={styles.stopButtonText}>stop</Text>
            </TouchableOpacity>
          </View>
          )}

          {error && (
          <View style={[styles.errorCard, styles.sectionSpacing]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          )}

          {showResults && (
          <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              {duplicates.map((group) => {
                const groupFiles = duplicateFiles.filter((file) => file.groupHash === group.hash);
                const groupTotalSize = groupFiles.reduce((sum, file) => sum + file.size, 0);

                return (
                  <View key={group.hash} style={styles.groupContainer}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupHeaderText}>
                        {groupFiles.length} item{groupFiles.length !== 1 ? 's' : ''}, {formatBytes(groupTotalSize)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleGroupSelectAll(group.hash)}
                        activeOpacity={0.85}
                        style={styles.groupSelectAllButton}
                      >
                        <Text style={styles.groupSelectAllText}>Select all</Text>
                      </TouchableOpacity>
                    </View>
                    {groupFiles.map((file: DuplicateFileItem) => {
                      const imageUri = ensurePreviewUri(file.path);
                      const hasLoadError = imageLoadErrors.has(file.path);
                      const showImage = !!imageUri && !hasLoadError;
                      const isSelected = selectedFileIds.has(file.id);

                      return (
                        <TouchableOpacity
                          key={file.id}
                          style={styles.fileItem}
                          onPress={() => toggleFileSelection(file.id)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.fileItemContent}>
                            {showImage ? (
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handlePreview(file);
                                }}
                                style={styles.fileThumbnail}
                              >
                                <Image
                                  source={{ uri: imageUri }}
                                  resizeMode="cover"
                                  onError={() => {
                                    setImageLoadErrors((prev) => new Set(prev).add(file.path));
                                  }}
                                  style={styles.fileThumbnailImage}
                                />
                              </Pressable>
                            ) : (
                              <View style={styles.fileIcon}>
                                <MaterialCommunityIcons
                                  name="image-outline"
                                  size={24}
                                  color={theme.colors.primary}
                                />
                              </View>
                            )}
                            <View style={styles.fileInfo}>
                              <Text style={styles.fileName} numberOfLines={1}>
                                {getFileName(file.path)}
                              </Text>
                              <Text style={styles.fileMeta}>
                                {formatBytes(file.size)} | {formatDate(file.modifiedDate)}
                              </Text>
                              <Text style={styles.fileSource}>{getFileSource(file.path)}</Text>
                            </View>
                            <View
                              style={[
                                styles.fileCheckbox,
                                isSelected && styles.fileCheckboxSelected,
                              ]}
                            >
                              {isSelected && (
                                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
          </View>
          )}

          {showNoResultsSummary && (
          <View style={[styles.summaryCard, styles.sectionSpacing]}>
              {progress.currentFile === 'Cancelled' ? (
                <>
                <Text style={styles.summaryTitle}>scan cancelled</Text>
                <Text style={styles.summaryText}>
                  scanned {progress.scannedFiles || progress.current || 0} files before cancellation.
                </Text>
                </>
              ) : (
                <>
                <Text style={styles.summaryTitle}>no duplicates found</Text>
                <Text style={styles.summaryText}>scanned {progress.total} files. all files are unique.</Text>
                </>
              )}
            <TouchableOpacity style={styles.rescanButton} onPress={startScan} activeOpacity={0.8}>
              <Text style={styles.rescanButtonText}>rescan</Text>
            </TouchableOpacity>
          </View>
          )}

          {showEmptyState && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <Text style={styles.emptyTitle}>no duplicate images yet</Text>
            <Text style={styles.emptySubtitle}>
                Start a scan to find identical photos and free up storage space.
            </Text>
          </View>
          )}
      </ScrollView>

      {!isScanning && duplicateFiles.length > 0 && !deleteDisabled && (
        <View style={styles.fixedDeleteButtonContainer}>
          <DeleteButton
            items={selectedStats.items}
            size={selectedStats.size}
            disabled={deleteDisabled}
          />
        </View>
      )}

      <Modal visible={!!previewFile} transparent animationType="fade" onRequestClose={handlePreviewClose}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity 
            style={styles.previewTouchArea}
            activeOpacity={1}
            onPress={handlePreviewClose}
          >
            {previewUri ? (
              <Image 
                source={{ uri: previewUri }} 
                resizeMode="contain" 
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.previewFallbackContainer}>
                <Text style={styles.previewFallback}>cannot load preview</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
     headerContainer: {
       paddingHorizontal: theme.spacing.lg,
       paddingTop: theme.spacing.lg,
     },
     stickyFilterContainer: {
       paddingHorizontal: theme.spacing.lg,
       paddingBottom: theme.spacing.md,
       backgroundColor: theme.colors.background,
       borderBottomWidth: 1,
       borderBottomColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
       zIndex: 10,
     },
     content: {
       paddingHorizontal: theme.spacing.lg,
       paddingTop: theme.spacing.md,
       paddingBottom: theme.spacing.xl * 1.5,
     },
    contentWithFixedButton: {
      paddingBottom: theme.spacing.xl * 3,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    filterRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    smartFilterCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
    },
    smartFilterText: {
      flex: 1,
      marginRight: theme.spacing.xs,
    },
    smartFilterLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    smartFilterCaption: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      marginTop: 2,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
    },
    filterButtonDisabled: {
      opacity: 0.5,
    },
     selectIndicator: {
       width: 24,
       height: 24,
       borderRadius: 12,
       borderWidth: 1.5,
       borderColor: `${theme.colors.primary}66`,
       alignItems: 'center',
       justifyContent: 'center',
       marginRight: theme.spacing.xs,
       backgroundColor: theme.colors.surface,
     },
     selectIndicatorAll: {
       backgroundColor: theme.colors.primary,
       borderColor: theme.colors.primary,
     },
     selectIndicatorPartial: {
       borderColor: `${theme.colors.primary}aa`,
     },
     selectIndicatorInner: {
       width: 6,
       height: 6,
       borderRadius: 3,
       backgroundColor: `${theme.colors.primary}66`,
     },
     selectIndicatorInnerPartial: {
       width: 10,
       height: 3,
       borderRadius: 1.5,
       backgroundColor: theme.colors.primary,
     },
    filterText: {
      flex: 1,
    },
    filterLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    filterHint: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      marginTop: 1,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.mode === 'dark' ? '#000000' : 'rgba(0,0,0,0.2)',
      shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      gap: theme.spacing.md,
    },
    timerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timerText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    fileCountText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    stopButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    stopButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    errorCard: {
      backgroundColor: `${theme.colors.error}11`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.error}55`,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.sm,
      textAlign: 'center',
    },
    resultsContainer: {
      gap: theme.spacing.lg,
    },
    groupContainer: {
      marginBottom: theme.spacing.lg,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    groupHeaderText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    groupSelectAllButton: {
      paddingVertical: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
    },
    groupSelectAllText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    fileItem: {
      marginBottom: theme.spacing.xs,
    },
    fileItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.sm,
    },
    fileThumbnail: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
    },
    fileThumbnailImage: {
      width: '100%',
      height: '100%',
    },
    fileIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}18`,
    },
    fileInfo: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    fileMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    fileSource: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
     fileCheckbox: {
       width: 24,
       height: 24,
       borderRadius: 6,
       borderWidth: 2,
       borderColor: `${theme.colors.primary}66`,
       backgroundColor: theme.colors.surface,
       alignItems: 'center',
       justifyContent: 'center',
     },
     fileCheckboxSelected: {
       backgroundColor: theme.colors.primary,
       borderColor: theme.colors.primary,
     },
    duplicateWrapper: {
      marginBottom: theme.spacing.xs,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.xs,
      shadowColor: theme.mode === 'dark' ? '#000000' : 'rgba(0,0,0,0.08)',
      shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    summaryTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: 'capitalize',
    },
    summaryText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    rescanButton: {
      marginTop: theme.spacing.md,
      alignSelf: 'flex-start',
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    rescanButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: 'capitalize',
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: 'center',
    },
    previewBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
    },
    previewTouchArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    },
    previewImage: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    },
    previewFallbackContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewFallback: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.md,
      textAlign: 'center',
    },
    fixedDeleteButtonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
  });

