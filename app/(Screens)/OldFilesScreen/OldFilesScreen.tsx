import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ListRenderItem, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import FileListItem from "../../../components/FileListItem";
import LoadingOverlay from "../../../components/LoadingOverlay";
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

const PREVIEWABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.mp4', '.mov'];

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
  
  // Images
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) {
    return 'Images';
  }
  
  // Videos
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) {
    return 'Videos';
  }
  
  // Documents
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) {
    return 'Documents';
  }
  
  // Audio
  if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) {
    return 'Audio';
  }
  
  // Archives
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) {
    return 'Archives';
  }
  
  return 'Other';
};

const getFilename = (path: string) => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const ensureFileUri = (path: string): string => {
  if (!path) {
    return path;
  }
  // If already has a URI scheme, return as is
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('data:')) {
    return path;
  }
  // Add file:// prefix for local file paths
  return `file://${path}`;
};

const formatModifiedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
};

const formatAgeDays = (days: number): string => {
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths > 0) {
      return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
};

const OldFilesScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dispatch = useDispatch();
  
  // Redux state
  const oldFiles = useSelector((state: RootState) => state.appState.oldFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.old);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.old);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  // Local UI state
  const [clearing, setClearing] = useState(false);
  const [filterType, setFilterType] = useState<FileCategory>('All');
  const [hasSavedResults, setHasSavedResults] = useState(false);

  // Load saved results on mount
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
      // Save results to database
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
    if (filterType === 'All') {
      return oldFiles;
    }
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

  const getFileIcon = useCallback((path: string): string => {
    const lower = path.toLowerCase();
    
    // Image files
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/)) {
      return 'image';
    }
    
    // Video files
    if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/)) {
      return 'video';
    }
    
    // Audio files
    if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) {
      return 'music';
    }
    
    // Documents
    if (lower.endsWith('.pdf')) return 'file-pdf-box';
    if (lower.match(/\.(doc|docx)$/)) return 'file-word-box';
    if (lower.match(/\.(xls|xlsx)$/)) return 'file-excel-box';
    if (lower.match(/\.(ppt|pptx)$/)) return 'file-powerpoint-box';
    if (lower.endsWith('.txt')) return 'file-document-outline';
    if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'folder-zip';
    
    return 'file-outline';
  }, []);

  const isPreviewableMedia = useCallback((path: string): boolean => {
    const lower = path.toLowerCase();
    return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }, []);

  const isImageFile = useCallback((path: string): boolean => {
    const lower = path.toLowerCase();
    return lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/) !== null;
  }, []);

  const isVideoFile = useCallback((path: string): boolean => {
    const lower = path.toLowerCase();
    return lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/) !== null;
  }, []);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
      return;
    }

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
              // Remove deleted items from state
              const remainingFiles = oldFiles.filter((file) => !selectedFilePaths.has(file.path));
              dispatch(setOldFileResults(remainingFiles));
              dispatch(clearSelections("old"));
              // Update database
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

  // Clear selection when files change
  useEffect(() => {
    const availablePaths = new Set(oldFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("old", validSelections));
    }
  }, [oldFiles, selectedFilePathsArray, dispatch]);

  const renderFileItem = useCallback<ListRenderItem<OldFileInfo>>(
    ({ item: file }) => {
      const filename = getFilename(file.path);
      const isSelected = selectedFilePaths.has(file.path);
      const isVideo = isVideoFile(file.path);
      const isImage = isImageFile(file.path);
      const previewable = isPreviewableMedia(file.path);
      const iconName = getFileIcon(file.path);
      const showThumbnail = previewable && (isImage || isVideo);
      const imageUri = showThumbnail ? ensureFileUri(file.path) : null;

      return (
        <FileListItem
          title={filename}
          subtitle={`${formatAgeDays(file.ageDays)} • ${formatModifiedDate(file.modifiedDate)}`}
          meta={file.path}
          size={file.size}
          icon={iconName as any}
          thumbnailUri={imageUri}
          selected={isSelected}
          onPress={() => toggleFileSelection(file.path)}
          rightAccessory={
            (isImage || isVideo) ? (
              <MaterialCommunityIcons
                name={isImage ? "image" : "video"}
                size={16}
                color={theme.colors.textMuted}
              />
            ) : null
          }
        />
      );
    },
    [
      getFileIcon,
      isImageFile,
      isPreviewableMedia,
      isVideoFile,
      selectedFilePaths,
      toggleFileSelection,
      theme.colors.textMuted,
    ]
  );

  const keyExtractor = useCallback((item: OldFileInfo, index: number) => {
    return `${item.path}-${index}`;
  }, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: !deleteDisabled && filteredFiles.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
    }),
    [theme.spacing.md, theme.spacing.lg, theme.spacing.xl, deleteDisabled, filteredFiles.length],
  );

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
                  style={styles.loadingCard}
                />
              ) : (
                <ScanActionButton label="Scan Old Files" onPress={handleScan} fullWidth />
              )}
            </View>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {FILTER_TYPES.map((type) => {
              const isActive = type === filterType;
              const countLabel = fileSummary[type].count;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterType(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {type.toLowerCase()} · {countLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    filtersScrollContent: {
      paddingRight: theme.spacing.lg,
    },
    filterChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.xs,
    },
    filterChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}22`,
    },
    filterChipText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    filterChipTextActive: {
      color: theme.colors.primary,
    },
    emptyContainer: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
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
    loadingCard: {
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.lg,
    },
    resultsHeader: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
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
