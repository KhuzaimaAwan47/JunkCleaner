import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ListRenderItem, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import CategoryFilterBar from "../../../components/CategoryFilterBar";
import DeleteButton from "../../../components/DeleteButton";
import LoadingOverlay from "../../../components/LoadingOverlay";
import OldFileListItem from "../../../components/OldFileListItem";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import {
  clearSelections,
  setLoading,
  setOldFileResults,
  setSelectedItems,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadOldFileResults, saveOldFileResults } from "../../../utils/db";
import { deleteOldFiles, OldFileInfo, scanOldFiles } from "./OldFilesScanner";

type FileCategory = 'All' | 'Images' | 'Videos' | 'Documents' | 'Audio' | 'Archives' | 'Other';

const FILTER_TYPES: FileCategory[] = [
  'All',
  'Images',
  'Videos',
  'Documents',
  'Audio',
  'Archives',
  'Other',
];

const categorizeFile = (path: string): FileCategory => {
  const lower = path.toLowerCase();
  
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) return 'Images';
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) return 'Videos';
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) return 'Documents';
  if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) return 'Audio';
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) return 'Archives';
  return 'Other';
};

const OldFilesScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dispatch = useDispatch();
  
  const oldFiles = useSelector((state: RootState) => state.appState.oldFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.old);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.old);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [clearing, setClearing] = useState(false);
  const [filterType, setFilterType] = useState<FileCategory>('All');
  const [hasSavedResults, setHasSavedResults] = useState(false);

  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadOldFileResults();
        if (savedResults.length > 0) {
          dispatch(setOldFileResults(savedResults));
          setHasSavedResults(true);
        } else {
          setHasSavedResults(false);
        }
      } catch (error) {
        console.error("Failed to load saved old file results:", error);
        setHasSavedResults(false);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    dispatch(setLoading("old", true));
    dispatch(clearSelections("old"));
    try {
      const files = await scanOldFiles(90);
      dispatch(setOldFileResults(files));
      await saveOldFileResults(files);
      setHasSavedResults(files.length > 0);
    } catch (error) {
      console.warn("OldFiles scan failed", error);
    } finally {
      dispatch(setLoading("old", false));
    }
  }, [dispatch]);

  const totalSize = useMemo(() => oldFiles.reduce((sum, file) => sum + file.size, 0), [oldFiles]);

  const filteredFiles = useMemo(() => {
    if (filterType === 'All') return oldFiles;
    return oldFiles.filter((file) => categorizeFile(file.path) === filterType);
  }, [oldFiles, filterType]);

  const fileSummary = useMemo(() => {
    const summary: Record<FileCategory, { count: number; size: number }> = {
      All: { count: oldFiles.length, size: totalSize },
      Images: { count: 0, size: 0 },
      Videos: { count: 0, size: 0 },
      Documents: { count: 0, size: 0 },
      Audio: { count: 0, size: 0 },
      Archives: { count: 0, size: 0 },
      Other: { count: 0, size: 0 },
    };

    oldFiles.forEach((file) => {
      const category = categorizeFile(file.path);
      summary[category].count += 1;
      summary[category].size += file.size;
    });

    return summary;
  }, [oldFiles, totalSize]);

  const categoryCounts = useMemo(() => 
    Object.fromEntries(FILTER_TYPES.map(type => [type, fileSummary[type].count])),
    [fileSummary]
  );

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    filteredFiles.forEach((file) => {
      if (selectedFilePaths.has(file.path)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [selectedFilePaths, filteredFiles]);

  const isAllSelected = useMemo(() => {
    return filteredFiles.length > 0 && filteredFiles.every((file) => selectedFilePaths.has(file.path));
  }, [filteredFiles, selectedFilePaths]);

  const deleteDisabled = selectedStats.items === 0;

  const toggleFileSelection = useCallback((path: string) => {
    dispatch(toggleItemSelection("old", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("old"));
    } else {
      const allPaths = filteredFiles.map((file) => file.path);
      dispatch(setSelectedItems("old", allPaths));
    }
  }, [isAllSelected, filteredFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) return;

    const filesToDelete = oldFiles.filter((file) => selectedFilePaths.has(file.path));
    Alert.alert(
      "Delete Old Files?",
      `This will permanently delete ${selectedStats.items} file${selectedStats.items !== 1 ? 's' : ''} (${formatBytes(selectedStats.size)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await deleteOldFiles(filesToDelete);
              const remainingFiles = oldFiles.filter((file) => !selectedFilePaths.has(file.path));
              dispatch(setOldFileResults(remainingFiles));
              dispatch(clearSelections("old"));
              await saveOldFileResults(remainingFiles);
            } catch (error) {
              console.warn("Delete old files failed", error);
              Alert.alert("Delete Failed", "Some files could not be deleted.");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [dispatch, selectedStats, selectedFilePaths, clearing, oldFiles]);

  useEffect(() => {
    const availablePaths = new Set(oldFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("old", validSelections));
    }
  }, [oldFiles, selectedFilePathsArray, dispatch]);

  const renderFileItem = useCallback<ListRenderItem<OldFileInfo>>(
    ({ item: file }) => (
      <OldFileListItem
        item={file}
        selected={selectedFilePaths.has(file.path)}
        onPress={() => toggleFileSelection(file.path)}
        onThumbnailError={() => {}}
      />
    ),
    [selectedFilePaths, toggleFileSelection]
  );

  const keyExtractor = useCallback((item: OldFileInfo, index: number) => `${item.path}-${index}`, []);

  const listContentInset = useMemo(() => ({
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: !deleteDisabled && filteredFiles.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
  }), [theme.spacing, deleteDisabled, filteredFiles.length]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Old Files" 
            totalSize={oldFiles.length > 0 ? totalSize : undefined}
            totalFiles={oldFiles.length > 0 ? oldFiles.length : undefined}
            isAllSelected={filteredFiles.length > 0 ? isAllSelected : undefined}
            onSelectAllPress={filteredFiles.length > 0 ? toggleSelectAll : undefined}
            selectAllDisabled={!filteredFiles.length}
          />
        </View>
        <View style={styles.stickyFilterContainer}>
          {!hasSavedResults && (
            <View style={styles.actionsRow}>
              {loading ? (
                <ScanProgressCard
                  title="Scanning for old files..."
                  subtitle="Looking for items you can safely delete."
                />
              ) : (
                <ScanActionButton label="Scan Old Files" onPress={handleScan} fullWidth />
              )}
            </View>
          )}
          <CategoryFilterBar
            categories={FILTER_TYPES}
            activeCategory={filterType}
            counts={categoryCounts}
            onCategoryChange={(category) => setFilterType(category as FileCategory)}
          />
        </View>

        <FlatList
          data={filteredFiles}
          keyExtractor={keyExtractor}
          renderItem={renderFileItem}
          contentContainerStyle={listContentInset}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              {loading ? (
                <ScanProgressCard title="Scanning for old files..." subtitle="Hang tight while we gather results." />
              ) : (
                <>
                  <Text style={styles.emptyTitle}>
                    {oldFiles.length ? "no files in this filter" : "ready to scan for old files"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {oldFiles.length
                      ? "try switching to another category."
                      : "tap scan to find items you might want to remove."}
                  </Text>
                  {!hasSavedResults && (
                    <ScanActionButton label="Scan Old Files" onPress={handleScan} fullWidth />
                  )}
                </>
              )}
            </View>
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />

        {!deleteDisabled && filteredFiles.length > 0 && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.items}
              size={selectedStats.size}
              disabled={deleteDisabled}
              onPress={handleDelete}
            />
          </View>
        )}
        <LoadingOverlay visible={loading} label="Scanning for old files..." />
      </SafeAreaView>
    </ScreenWrapper>
  );
};

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
      gap: theme.spacing.sm,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    emptyCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      textAlign: "center",
      fontSize: 13,
    },
    footerSpacer: {
      height: theme.spacing.xl,
    },
    fixedDeleteButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
  });

export default OldFilesScreen;
