import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, useTheme } from 'styled-components/native';
import AppHeader from '../../../components/AppHeader';
import DeleteButton from '../../../components/DeleteButton';
import { DuplicateFileItem } from '../../../components/DuplicateCard';
import DuplicateFileItemComponent from '../../../components/DuplicateFileItem';
import DuplicateFilterBar from '../../../components/DuplicateFilterBar';
import DuplicateGroupHeader from '../../../components/DuplicateGroupHeader';
import DuplicateProgressCard from '../../../components/DuplicateProgressCard';
import DuplicateSummaryCard from '../../../components/DuplicateSummaryCard';
import EmptyState from '../../../components/EmptyState';
import ImagePreviewModal from '../../../components/ImagePreviewModal';
import ScanActionButton from '../../../components/ScanActionButton';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { useScanner } from './DuplicateImageScanner';
import { useDuplicateSelection } from './useDuplicateSelection';
import { useScanTimer } from './useScanTimer';

export default function DuplicateImagesScreen() {
  const { isScanning, isRestoring, progress, duplicates, error, startScan, stopScan } = useScanner();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { elapsedTime, pulseScale } = useScanTimer(isScanning);
  const [previewFile, setPreviewFile] = useState<DuplicateFileItem | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(() => new Set());

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

  const {
    selectedFileIds,
    smartFiltering,
    selectedStats,
    selectionState,
    selectAllActionLabel,
    selectAllDisabled,
    selectAllHint,
    toggleFileSelection,
    handleSmartFilteringToggle,
    handleSelectAll,
    handleGroupSelectAll,
  } = useDuplicateSelection(duplicates, duplicateFiles);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressPercent = progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0;
  const scannedFiles = progress.scannedFiles ?? progress.current;
  const totalFiles = progress.totalFiles ?? progress.total;

  const deleteDisabled = selectedStats.items === 0;
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
        <DuplicateFilterBar
          selectionState={selectionState}
          selectAllActionLabel={selectAllActionLabel}
          selectAllHint={selectAllHint}
          selectAllDisabled={selectAllDisabled}
          smartFiltering={smartFiltering}
          onSelectAll={handleSelectAll}
          onSmartFilterToggle={handleSmartFilteringToggle}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            !isScanning && duplicateFiles.length > 0 && styles.contentWithFixedButton,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {showStartButton && (
            <Animated.View style={[buttonAnimatedStyle, styles.sectionSpacing]}>
              <ScanActionButton label="start scan" onPress={startScan} fullWidth />
            </Animated.View>
          )}

          {isScanning && (
            <View style={styles.sectionSpacing}>
              <DuplicateProgressCard
                elapsedTime={elapsedTime}
                scannedFiles={scannedFiles}
                totalFiles={totalFiles}
                progress={progressPercent}
                currentFile={progress.currentFile}
                stage={progress.stage}
                onStop={stopScan}
              />
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
                    <DuplicateGroupHeader
                      itemCount={groupFiles.length}
                      totalSize={groupTotalSize}
                      onSelectAll={() => handleGroupSelectAll(group.hash)}
                    />
                    {groupFiles.map((file: DuplicateFileItem) => (
                      <DuplicateFileItemComponent
                        key={file.id}
                        file={file}
                        isSelected={selectedFileIds.has(file.id)}
                        hasLoadError={imageLoadErrors.has(file.path)}
                        onToggleSelect={() => toggleFileSelection(file.id)}
                        onPreview={(f) => setPreviewFile(f)}
                        onImageError={() => setImageLoadErrors((prev) => new Set(prev).add(file.path))}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {showNoResultsSummary && (
            <View style={styles.sectionSpacing}>
              <DuplicateSummaryCard
                isCancelled={progress.currentFile === 'Cancelled'}
                scannedCount={progress.scannedFiles || progress.current || 0}
                totalScanned={progress.total}
                onRescan={startScan}
              />
            </View>
          )}

          {showEmptyState && (
            <View style={styles.sectionSpacing}>
              <EmptyState
                icon="image-outline"
                title="no duplicate images yet"
                description="Start a scan to find identical photos and free up storage space."
                actionLabel="Rescan"
                onAction={startScan}
              />
            </View>
          )}
        </ScrollView>

        {!isScanning && duplicateFiles.length > 0 && !deleteDisabled && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton items={selectedStats.items} size={selectedStats.size} disabled={deleteDisabled} />
          </View>
        )}

        <ImagePreviewModal
          visible={!!previewFile}
          imagePath={previewFile?.path || null}
          onClose={() => setPreviewFile(null)}
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: { flex: 1 },
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
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
