import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import {
  setOldFileResults,
  setLoading,
  toggleItemSelection,
  clearSelections,
  setSelectedItems,
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
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<FileCategory>('All');

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadOldFileResults();
        if (savedResults.length > 0) {
          dispatch(setOldFileResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved old file results:", error);
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

  const deleteDisabled = selectedStats.items === 0;

  const isAllSelected = useMemo(() => {
    return filteredFiles.length > 0 && filteredFiles.every((file) => selectedFilePaths.has(file.path));
  }, [filteredFiles, selectedFilePaths]);

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

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => {
      if (prev[path]) {
        return prev;
      }
      return { ...prev, [path]: true };
    });
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
  }, [selectedStats, selectedFilePaths, clearing, oldFiles]);

  // Clear selection when files change
  useEffect(() => {
    const availablePaths = new Set(oldFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("old", validSelections));
    }
  }, [oldFiles, selectedFilePathsArray, dispatch]);

  const renderFileItem = useCallback<ListRenderItem<OldFileInfo>>(({ item: file }) => {
    const filename = getFilename(file.path);
    const isSelected = selectedFilePaths.has(file.path);
    const isVideo = isVideoFile(file.path);
    const isImage = isImageFile(file.path);
    const previewable = isPreviewableMedia(file.path) && !thumbnailFallbacks[file.path];
    const iconName = getFileIcon(file.path);
    
    // Show thumbnail for images and videos that are previewable
    const showThumbnail = previewable && (isImage || isVideo);
    const imageUri = showThumbnail ? ensureFileUri(file.path) : null;
    
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => toggleFileSelection(file.path)}
      >
        <View style={styles.thumbWrapper}>
          {showThumbnail && imageUri ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="cover"
              style={styles.thumbnailImage}
              onError={() => recordThumbnailError(file.path)}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={40}
                color={theme.colors.textMuted}
              />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectionBadge}>
              <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
            </View>
          )}
          {isImage && !showThumbnail && !isSelected && (
            <View style={styles.fileTypeBadge}>
              <MaterialCommunityIcons
                name="image"
                size={16}
                color={theme.colors.white}
              />
            </View>
          )}
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.fileName} numberOfLines={1}>{filename}</Text>
            <Text style={styles.size}>{formatBytes(file.size)}</Text>
          </View>
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>Age: {formatAgeDays(file.ageDays)}</Text>
            <Text style={styles.metaText}>{formatModifiedDate(file.modifiedDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, selectedFilePaths, theme.colors.white, theme.colors.textMuted, toggleFileSelection, thumbnailFallbacks, isPreviewableMedia, getFileIcon, isVideoFile, isImageFile, recordThumbnailError]);

  const keyExtractor = useCallback((item: OldFileInfo, index: number) => {
    return `${item.path}-${index}`;
  }, []);


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
            selectAllDisabled={filteredFiles.length > 0 ? !filteredFiles.length : undefined}
          />
        </View>
        {oldFiles.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Pressable
              onPress={handleScan}
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.scanButtonPressed,
                loading && styles.scanButtonDisabled,
              ]}
              disabled={loading}
            >
              <Text style={styles.scanButtonText}>
                {loading ? "Scanning..." : "Scan Old Files"}
              </Text>
            </Pressable>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator style={styles.spinner} color={theme.colors.accent} />
            <Text style={styles.loadingText}>Scanning for old files...</Text>
          </View>
        )}

        {oldFiles.length > 0 && !loading && (
          <>
            <View style={styles.stickyFilterContainer}>
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
              contentContainerStyle={[
                styles.listContent,
                !deleteDisabled && styles.listContentWithButton
              ]}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={styles.footerSpacer} />}
            />
          </>
        )}
        {!deleteDisabled && filteredFiles.length > 0 && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.items}
              size={selectedStats.size}
              disabled={clearing}
              onPress={handleDelete}
            />
          </View>
        )}
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
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: theme.colors.primary,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    listContentWithButton: {
      paddingBottom: theme.spacing.xl * 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    loadingContainer: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    scanButton: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 200,
    },
    scanButtonPressed: {
      opacity: 0.9,
    },
    scanButtonDisabled: {
      opacity: 0.65,
    },
    scanButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    spinner: {
      marginTop: theme.spacing.sm,
    },
    resultsHeader: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    footerSpacer: {
      height: theme.spacing.xl,
    },
    resultsTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    resultsSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    item: {
      flexDirection: "row",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      marginBottom: theme.spacing.sm,
      position: "relative",
    },
    itemSelected: {
      backgroundColor: `${theme.colors.primary}22`,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    thumbWrapper: {
      width: 60,
      height: 60,
      borderRadius: theme.radii.lg,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}55`,
      marginRight: theme.spacing.md,
      position: "relative",
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
    },
    thumbnailFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    selectionBadge: {
      position: "absolute",
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    fileTypeBadge: {
      position: "absolute",
      bottom: theme.spacing.xs,
      right: theme.spacing.xs,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    itemContent: {
      flex: 1,
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
      borderTopColor: `${theme.colors.surfaceAlt}55`,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    fileName: {
      flex: 1,
      marginRight: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: "600",
      fontSize: 15,
    },
    size: {
      color: theme.colors.accent,
      fontWeight: "700",
      fontSize: 14,
    },
    itemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs / 2,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    pathText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: theme.spacing.xs / 2,
    },
  });

export default OldFilesScreen;
