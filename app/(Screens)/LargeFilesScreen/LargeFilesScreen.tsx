import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import formatBytes from "../../../constants/formatBytes";
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
  const [lastScan, setLastScan] = useState<number | null>(null);
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

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    setError(null);
    setThumbnailFallbacks({});
    setScanProgress({ percent: 0, phase: "permissions", detail: "requesting access" });
    try {
      const results = await scanLargeFiles(undefined, (snapshot) => {
        setScanProgress({
          percent: Math.round(snapshot.ratio * 100),
          phase: snapshot.phase,
          detail: snapshot.detail,
        });
      });
      setFiles(results);
      setLastScan(Date.now());
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

  const renderItem = useCallback<ListRenderItem<LargeFileResult>>(
    ({ item }) => {
      const filename = item.path.split("/").pop() || item.path;
      const previewable = isPreviewableAsset(item.path) && !thumbnailFallbacks[item.path];
      return (
        <View style={styles.fileCard}>
          <View style={styles.fileRow}>
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
                    name="file-document-outline"
                    size={26}
                    color={theme.colors.textMuted}
                  />
                </View>
              )}
            </View>
            <View style={styles.fileContent}>
              <View style={styles.fileHeader}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {filename}
                </Text>
                <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
              </View>
              <View style={styles.badgeRow}>
                <Text style={styles.tag}>{item.category}</Text>
                <Text style={[styles.tag, styles.tagAccent]}>{item.source}</Text>
                {item.modified != null ? (
                  <Text style={styles.metaText}>{formatTimestamp(item.modified)}</Text>
                ) : null}
              </View>
              <Text style={styles.pathText} numberOfLines={2}>
                {item.path}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [recordThumbnailError, theme.colors.textMuted, thumbnailFallbacks, styles],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <AppHeader title="large files" />

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>sniff out the biggest storage hogs</Text>
            <Text style={styles.heroSubtitle}>
              scan your device for large files that are consuming valuable storage space
            </Text>
          </View>

          {loading ? (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.progressPercent}>{Math.min(100, Math.max(0, scanProgress.percent))}%</Text>
              </View>
              <Text style={styles.progressText}>{progressLabel}</Text>
              <Text style={styles.progressSubtext}>{progressDetail}</Text>
            </View>
          ) : (
            <TouchableOpacity
              disabled={loading}
              onPress={handleScan}
              activeOpacity={0.9}
              style={[styles.scanButton, loading && styles.scanButtonDisabled]}
            >
              <Text style={styles.scanButtonText}>
                {loading ? "scanning…" : resultsAvailable ? "rescan storage" : "start storage scan"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              {resultsAvailable ? "visible weight" : "total weight"}
            </Text>
            <Text style={styles.metricValue}>{formatBytes(summaryBytes)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>files found</Text>
            <Text style={styles.metricValue}>{filesInView}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>last scan</Text>
            <Text style={styles.metricValue}>{lastScan ? formatLastScan(lastScan) : "—"}</Text>
          </View>
        </View>

        <View style={styles.resultsCard}>
          {resultsAvailable ? (
            <FlatList
              data={sortedFiles}
              keyExtractor={(item) => item.path}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>no large files detected</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name={error ? "alert-circle-outline" : "file-search-outline"}
                size={48}
                color={error ? theme.colors.error : theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, error && styles.emptyTextError]}>
                {error || "run a scan to find large files consuming storage space"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString();
};

const formatLastScan = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const PREVIEW_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

const isPreviewableAsset = (path: string): boolean => {
  const lower = path.toLowerCase();
  return PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export default LargeFilesScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    heroCard: {
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.md,
    },
    heroHeader: {
      gap: theme.spacing.sm,
    },
    heroTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      lineHeight: 20,
    },
    progressCard: {
      backgroundColor: `${theme.colors.surfaceAlt}33`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
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
    scanButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    scanButtonDisabled: {
      opacity: 0.6,
    },
    scanButtonText: {
      color: theme.colors.background,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    metricsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    metricCard: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      marginTop: theme.spacing.xs / 2,
    },
    emptyTextError: {
      color: theme.colors.error,
    },
    resultsCard: {
      flex: 1,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      padding: theme.spacing.md,
      minHeight: 200,
    },
    listContent: {
      paddingBottom: theme.spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    emptyIcon: {
      opacity: 0.5,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    fileCard: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    fileRow: {
      flexDirection: "row",
    },
    thumbnailWrapper: {
      width: 56,
      height: 56,
      borderRadius: theme.radii.md,
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
    fileContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
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
      fontWeight: theme.fontWeight.semibold,
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
      marginTop: theme.spacing.xs / 2,
    },
  });