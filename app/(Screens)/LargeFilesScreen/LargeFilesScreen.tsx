import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import {
  setLargeFileResults,
  setLoading,
  toggleItemSelection,
  clearSelections,
  setSelectedItems,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadLargeFileResults, saveLargeFileResults } from "../../../utils/db";
import {
    LargeFileResult,
    LargeFileSource,
    ScanPhase,
    scanLargeFiles,
} from "./LargeFileScanner";

type SourceFilter = LargeFileSource | "all";
type ProgressPhase = ScanPhase | "idle";

const LargeFilesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Redux state
  const files = useSelector((state: RootState) => state.appState.largeFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.large);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.large);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  // Local UI state
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDatabaseResults, setHasDatabaseResults] = useState<boolean>(false);
  const sortMode: "size" | "recent" | "category" = "size";
  const sourceFilter: SourceFilter = "all";
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState<Record<string, boolean>>({});
  const [scanProgress, setScanProgress] = useState<{ percent: number; phase: ProgressPhase; detail?: string }>({
    percent: 0,
    phase: "idle",
  });

  const filteredFiles = useMemo(() => {
    if (sourceFilter === "all") {
      return files;
    }
    return files.filter((file) => file.source === sourceFilter);
  }, [files, sourceFilter]);

  const sortedFiles = useMemo(() => {
    const copy = [...filteredFiles];
    return copy.sort((a, b) => {
      if (sortMode === "size") {
        return b.size - a.size;
      }
      if (sortMode === "recent") {
        return (b.modified ?? 0) - (a.modified ?? 0);
      }
      return a.category.localeCompare(b.category);
    });
  }, [filteredFiles, sortMode]);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const visibleBytes = useMemo(() => sortedFiles.reduce((sum, file) => sum + file.size, 0), [sortedFiles]);

  const resultsAvailable = sortedFiles.length > 0;
  const filesInView = resultsAvailable ? sortedFiles.length : files.length;
  const summaryBytes = resultsAvailable ? visibleBytes : totalBytes;

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    sortedFiles.forEach((file) => {
      if (selectedFilePaths.has(file.path)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [selectedFilePaths, sortedFiles]);

  const deleteDisabled = selectedStats.items === 0;

  const isAllSelected = useMemo(() => {
    return sortedFiles.length > 0 && sortedFiles.every((file) => selectedFilePaths.has(file.path));
  }, [sortedFiles, selectedFilePaths]);

  const toggleFileSelection = useCallback((path: string) => {
    dispatch(toggleItemSelection("large", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("large"));
    } else {
      const allPaths = sortedFiles.map((file) => file.path);
      dispatch(setSelectedItems("large", allPaths));
    }
  }, [isAllSelected, sortedFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
      return;
    }
    // TODO: Implement actual file deletion logic
    console.log("Deleting files:", Array.from(selectedFilePaths));
    setClearing(true);
    try {
      // After deletion, remove from state and update files
      const remainingFiles = files.filter((file) => !selectedFilePaths.has(file.path));
      dispatch(setLargeFileResults(remainingFiles));
      dispatch(clearSelections("large"));
    } finally {
      setClearing(false);
    }
  }, [selectedFilePaths, selectedStats.items, clearing]);

  const progressLabel = useMemo(() => {
    switch (scanProgress.phase) {
      case "permissions":
        return "checking storage permissions";
      case "media":
        return "indexing media library";
      case "directories":
        return "sweeping folders";
      case "extensions":
        return "flagging heavy extensions";
      case "finalizing":
        return "wrapping up results";
      default:
        return "scanning high-impact folders…";
    }
  }, [scanProgress.phase]);
  const progressDetail = scanProgress.detail ?? "downloads · dcim · movies · whatsapp media";

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadLargeFileResults();
        setHasDatabaseResults(savedResults.length > 0);
        if (savedResults.length > 0) {
          dispatch(setLargeFileResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved large file results:", error);
        setHasDatabaseResults(false);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    dispatch(setLoading("large", true));
    setError(null);
    setThumbnailFallbacks({});
    setScanProgress({ percent: 0, phase: "permissions", detail: "requesting access" });
    try {
      const results = await scanLargeFiles(512 * 1024 * 1024, (snapshot) => {
        setScanProgress({
          percent: Math.round(snapshot.ratio * 100),
          phase: snapshot.phase,
          detail: snapshot.detail,
        });
      });
      dispatch(setLargeFileResults(results));
      dispatch(clearSelections("large"));
      // Save results to database
      await saveLargeFileResults(results);
      setHasDatabaseResults(results.length > 0);
      if (results.length === 0) {
        setError("no large files detected yet. grant storage permission in settings for more coverage.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to scan files. please try again.");
    } finally {
      dispatch(setLoading("large", false));
    }
  }, [loading, dispatch]);

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => {
      if (prev[path]) {
        return prev;
      }
      return { ...prev, [path]: true };
    });
  }, []);

  // Clear selection when files change
  useEffect(() => {
    const availablePaths = new Set(sortedFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("large", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

  const renderFileItem = useCallback(
    (item: LargeFileResult) => {
      const filename = item.path.split("/").pop() || item.path;
      const previewable = isPreviewableAsset(item.path) && !thumbnailFallbacks[item.path];
      const fileIcon = getFileTypeIcon(item.path);
      const isVideo = isVideoFile(item.path);
      const isImage = isImageFile(item.path);
      const isSelected = selectedFilePaths.has(item.path);
      
      return (
        <TouchableOpacity
          key={item.path}
          style={styles.itemWrapper}
          onPress={() => toggleFileSelection(item.path)}
          activeOpacity={0.85}
        >
          <NeumorphicContainer 
            padding={theme.spacing.md}
            style={isSelected ? styles.itemSelected : undefined}
          >
            <View style={styles.itemInner}>
              <View style={styles.thumbnailWrapper}>
                {previewable ? (
                  <Image
                    source={{ uri: item.path }}
                    resizeMode="cover"
                    style={styles.thumbnailImage}
                    onError={() => recordThumbnailError(item.path)}
                  />
                ) : (
                  <View style={styles.thumbnailFallback}>
                    <MaterialCommunityIcons
                      name={fileIcon as any}
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                {isSelected && (
                  <View style={styles.selectionBadge}>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
                {isVideo && !isSelected && (
                  <View style={styles.fileTypeBadge}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
                {isImage && !previewable && !isSelected && (
                  <View style={styles.fileTypeBadge}>
                    <MaterialCommunityIcons
                      name="image"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
              </View>
              <View style={styles.infoColumn}>
                <View style={styles.fileHeader}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {filename}
                  </Text>
                  <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={styles.tag}>{item.category}</Text>
                  {item.modified != null ? (
                    <Text style={styles.metaText}>{formatTimestamp(item.modified)}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </NeumorphicContainer>
        </TouchableOpacity>
      );
    },
    [recordThumbnailError, theme.colors.primary, theme.colors.white, theme.spacing.md, thumbnailFallbacks, styles, selectedFilePaths, toggleFileSelection],
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Large Files" 
            subtitle="Find and manage storage hogs"
            totalSize={resultsAvailable ? summaryBytes : undefined}
            totalFiles={resultsAvailable ? filesInView : undefined}
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !sortedFiles.length : undefined}
          />
        </View>
        <ScrollView 
          contentContainerStyle={[
            styles.content,
            !deleteDisabled && resultsAvailable ? { paddingBottom: theme.spacing.xl * 3 } : {}
          ]} 
          showsVerticalScrollIndicator={false}
        >
        {!loading && !resultsAvailable && (
          <View style={[styles.primaryButtonContainer, styles.sectionSpacing]}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleScan} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>start storage scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={[styles.progressCard, styles.sectionSpacing]}>
            <View style={styles.progressHeader}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.progressPercent}>{Math.min(100, Math.max(0, scanProgress.percent))}%</Text>
            </View>
            <Text style={styles.progressText}>{progressLabel}</Text>
            <Text style={styles.progressSubtext}>{progressDetail}</Text>
          </View>
        )}

        {!loading && resultsAvailable && (
          <>
           

            <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              {sortedFiles.map((file) => renderFileItem(file))}
            </View>

            {!hasDatabaseResults && (
              <View style={[styles.rescanContainer, styles.sectionSpacing]}>
                <TouchableOpacity style={styles.rescanButton} onPress={handleScan} activeOpacity={0.8}>
                  <Text style={styles.rescanButtonText}>rescan</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {!loading && !resultsAvailable && error && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.error}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, styles.emptyTextError]}>{error}</Text>
          </View>
        )}

        {!loading && !resultsAvailable && !error && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <MaterialCommunityIcons
              name="file-search-outline"
              size={48}
              color={theme.colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>no large files detected</Text>
            <Text style={styles.emptySubtitle}>
              Run a scan to find large files consuming storage space
            </Text>
          </View>
        )}
      </ScrollView>
      {!deleteDisabled && resultsAvailable && (
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

const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString();
};

const PREVIEW_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".mpg", ".mpeg"];

const isPreviewableAsset = (path: string): boolean => {
  const lower = path.toLowerCase();
  return PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const isVideoFile = (path: string): boolean => {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const isImageFile = (path: string): boolean => {
  return isPreviewableAsset(path);
};

const getFileTypeIcon = (path: string): string => {
  if (isVideoFile(path)) {
    return "video-outline";
  }
  if (isImageFile(path)) {
    return "image-outline";
  }
  return "file-document-outline";
};

export default LargeFilesScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    primaryButtonContainer: {
      marginTop: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.2)",
      shadowOpacity: theme.mode === "dark" ? 0.4 : 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      gap: theme.spacing.xs,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressPercent: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.primary,
    },
    progressText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      fontWeight: theme.fontWeight.semibold,
    },
    progressSubtext: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textMuted,
    },
    resultsContainer: {
      gap: theme.spacing.xs,
    },
    selectionMetaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
    },
    selectionTextWrap: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    selectionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    selectionValue: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginTop: 4,
    },
    itemWrapper: {
      marginVertical: 0,
    },
    itemInner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    itemSelected: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    thumbnailWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor: `${theme.colors.primary}18`,
    },
    selectionBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0, 0, 0, 0.25)",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    fileTypeBadge: {
      position: "absolute",
      bottom: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    fileName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    fileSize: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.surfaceAlt}66`,
      color: theme.colors.text,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    tagAccent: {
      backgroundColor: `${theme.colors.primary}22`,
      color: theme.colors.primary,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    pathText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    rescanContainer: {
      marginTop: theme.spacing.md,
    },
    rescanButton: {
      alignSelf: "flex-start",
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
      textTransform: "uppercase",
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    emptyIcon: {
      opacity: 0.5,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
    emptyTextError: {
      color: theme.colors.error,
    },
    fixedDeleteButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
  });