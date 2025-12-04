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
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [files, setFiles] = useState<LargeFileResult[]>([]);
  const [loading, setLoading] = useState(false);
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
          setFiles(savedResults);
        }
      } catch (error) {
        console.error("Failed to load saved large file results:", error);
        setHasDatabaseResults(false);
      }
    };
    loadSavedResults();
  }, []);

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
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
      setFiles(results);
      // Save results to database
      await saveLargeFileResults(results);
      setHasDatabaseResults(results.length > 0);
      if (results.length === 0) {
        setError("no large files detected yet. grant storage permission in settings for more coverage.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to scan files. please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => {
      if (prev[path]) {
        return prev;
      }
      return { ...prev, [path]: true };
    });
  }, []);

  const renderFileItem = useCallback(
    (item: LargeFileResult) => {
      const filename = item.path.split("/").pop() || item.path;
      const previewable = isPreviewableAsset(item.path) && !thumbnailFallbacks[item.path];
      const fileIcon = getFileTypeIcon(item.path);
      const isVideo = isVideoFile(item.path);
      const isImage = isImageFile(item.path);
      
      return (
        <View key={item.path} style={styles.itemWrapper}>
          <NeumorphicContainer padding={theme.spacing.md}>
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
                {isVideo && (
                  <View style={styles.fileTypeBadge}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
                {isImage && !previewable && (
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
                <Text style={styles.pathText} numberOfLines={1}>
                  {item.path}
                </Text>
              </View>
            </View>
          </NeumorphicContainer>
        </View>
      );
    },
    [recordThumbnailError, theme.colors.primary, theme.colors.white, theme.spacing.md, thumbnailFallbacks, styles],
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader title="Large Files" subtitle="Find and manage storage hogs" />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={[styles.metricsRow, styles.sectionSpacing]}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <MaterialCommunityIcons
                    name="harddisk"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.metricLabel}>total size</Text>
                <Text style={styles.metricValue}>{formatBytes(summaryBytes)}</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <MaterialCommunityIcons
                    name="file-multiple-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.metricLabel}>files found</Text>
                <Text style={styles.metricValue}>{filesInView}</Text>
              </View>
            </View>

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
    metricsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    metricCard: {
      flex: 1,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
    },
    metricIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontWeight: theme.fontWeight.semibold,
      marginBottom: theme.spacing.xs / 2,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
      textAlign: "center",
    },
    resultsContainer: {
      gap: theme.spacing.xs,
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
    thumbnailWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
      alignItems: "center",
      justifyContent: "center",
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
  });