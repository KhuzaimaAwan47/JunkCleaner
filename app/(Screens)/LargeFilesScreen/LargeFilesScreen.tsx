import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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
  const pulseScale = useSharedValue(1);

  const listContentInset = useMemo(
    () => ({
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    }),
    [theme.spacing.lg, theme.spacing.xl],
  );

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

  const startButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (!sortedFiles.length && !loading && !error) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true,
      );
      return;
    }
    pulseScale.value = withTiming(1, { duration: 250 });
  }, [sortedFiles.length, loading, error, pulseScale]);

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
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={sortedFiles}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
        contentContainerStyle={[listContentInset, styles.listContent]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AppHeader title="large files" subtitle="sniff out the biggest storage hogs" />

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons
                    name="folder-arrow-down-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.summaryValue}>{formatBytes(summaryBytes)}</Text>
                <Text style={styles.summaryLabel}>
                  {resultsAvailable ? "visible weight" : "total weight"}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons name="file-search-outline" size={20} color={theme.colors.accent} />
                </View>
                <Text style={styles.summaryValue}>{filesInView}</Text>
                <Text style={styles.summaryLabel}>files found</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.secondary} />
                </View>
                <Text style={styles.summaryValue}>{lastScan ? formatLastScan(lastScan) : "—"}</Text>
                <Text style={styles.summaryLabel}>last scan</Text>
              </View>
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
            ) : null}

            {!resultsAvailable ? (
              <Animated.View style={startButtonAnimatedStyle}>
                <TouchableOpacity
                  disabled={loading}
                  onPress={handleScan}
                  activeOpacity={0.9}
                  style={styles.scanButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.scanButtonText}>start storage scan</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.actionRow}>
                <Text style={styles.actionHint}>need a fresh audit?</Text>
                <TouchableOpacity
                  disabled={loading}
                  onPress={handleScan}
                  activeOpacity={loading ? 1 : 0.9}
                  style={[styles.rescanButton, loading && styles.rescanDisabled]}
                >
                  <Text style={styles.rescanButtonText}>{loading ? "scanning…" : "run scan"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
       showsVerticalScrollIndicator={false}
      />
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
    listContent: {
      paddingBottom: theme.spacing.xl * 1.5,
    },
    listHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      shadowColor: "rgba(0,0,0,0.05)",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    summaryIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}11`,
    },
    summaryValue: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    summaryLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      marginBottom: theme.spacing.lg,
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
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0,0,0,0.25)",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      marginBottom: theme.spacing.lg,
    },
    scanButtonText: {
      color: "#fff",
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      marginBottom: theme.spacing.lg,
    },
    actionHint: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    rescanButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    rescanDisabled: {
      opacity: 0.6,
    },
    rescanButtonText: {
      color: "#fff",
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    fileCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}33`,
      shadowColor: "rgba(0,0,0,0.05)",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    fileRow: {
      flexDirection: "row",
    },
    thumbnailWrapper: {
      width: 64,
      height: 64,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}55`,
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
      backgroundColor: `${theme.colors.surfaceAlt}66`,
    },
    fileContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
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
      marginTop: theme.spacing.xs,
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
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs / 2,
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
      fontSize: theme.fontSize.sm,
    },
  });