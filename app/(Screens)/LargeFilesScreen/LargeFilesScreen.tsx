import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ListRenderItem } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import formatBytes from "../../../constants/formatBytes";
import { largeFilesScreenStyles } from "../../../styles/GlobalStyles";
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
  const {
    Screen,
    ListHeader,
    SummaryRow,
    SummarySlot,
    SummaryCard,
    SummaryIcon,
    SummaryValue,
    SummaryLabel,
    ProgressCard,
    ProgressHeader,
    ProgressText,
    ProgressPercent,
    ProgressSubtext,
    ScanButton,
    ScanButtonText,
    ActionRow,
    ActionHint,
    RescanButton,
    RescanButtonText,
    FileCard,
    FileRow,
    ThumbnailWrapper,
    ThumbnailImage,
    ThumbnailFallback,
    FileContent,
    FileHeader,
    FileName,
    FileSize,
    BadgeRow,
    Tag,
    MetaText,
    PathText,
  } = largeFilesScreenStyles;
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
        <FileCard>
          <FileRow>
            <ThumbnailWrapper>
              {previewable ? (
                <ThumbnailImage
                  source={{ uri: item.path }}
                  resizeMode="cover"
                  onError={() => recordThumbnailError(item.path)}
                />
              ) : (
                <ThumbnailFallback>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={26}
                    color={theme.colors.textMuted}
                  />
                </ThumbnailFallback>
              )}
            </ThumbnailWrapper>
            <FileContent>
              <FileHeader>
                <FileName numberOfLines={1}>{filename}</FileName>
                <FileSize>{formatBytes(item.size)}</FileSize>
              </FileHeader>
              <BadgeRow>
                <Tag>{item.category}</Tag>
                <Tag accent>{item.source}</Tag>
                {item.modified != null ? <MetaText>{formatTimestamp(item.modified)}</MetaText> : null}
              </BadgeRow>
              <PathText numberOfLines={2}>{item.path}</PathText>
            </FileContent>
          </FileRow>
        </FileCard>
      );
    },
    [
      recordThumbnailError,
      theme.colors.textMuted,
      thumbnailFallbacks,
      FileCard,
      FileRow,
      ThumbnailWrapper,
      ThumbnailImage,
      ThumbnailFallback,
      FileContent,
      FileHeader,
      FileName,
      FileSize,
      BadgeRow,
      Tag,
      MetaText,
      PathText,
    ],
  );

  return (
    <Screen>
      <FlatList
        data={sortedFiles}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
        contentContainerStyle={listContentInset}
        ListHeaderComponent={
          <ListHeader>
            <AppHeader title="large files" subtitle="sniff out the biggest storage hogs" />

            <SummaryRow>
              <SummarySlot>
                <SummaryCard>
                  <SummaryIcon>
                    <MaterialCommunityIcons
                      name="folder-arrow-down-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </SummaryIcon>
                  <SummaryValue>{formatBytes(summaryBytes)}</SummaryValue>
                  <SummaryLabel>{resultsAvailable ? "visible weight" : "total weight"}</SummaryLabel>
                </SummaryCard>
              </SummarySlot>
              <SummarySlot>
                <SummaryCard>
                  <SummaryIcon>
                    <MaterialCommunityIcons name="file-search-outline" size={20} color={theme.colors.accent} />
                  </SummaryIcon>
                  <SummaryValue>{filesInView}</SummaryValue>
                  <SummaryLabel>files found</SummaryLabel>
                </SummaryCard>
              </SummarySlot>
              <SummarySlot isLast>
                <SummaryCard>
                  <SummaryIcon>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.secondary} />
                  </SummaryIcon>
                  <SummaryValue>{lastScan ? formatLastScan(lastScan) : "—"}</SummaryValue>
                  <SummaryLabel>last scan</SummaryLabel>
                </SummaryCard>
              </SummarySlot>
            </SummaryRow>

            {loading ? (
              <ProgressCard>
                <ProgressHeader>
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                  <ProgressPercent>{Math.min(100, Math.max(0, scanProgress.percent))}%</ProgressPercent>
                </ProgressHeader>
                <ProgressText>{progressLabel}</ProgressText>
                <ProgressSubtext>{progressDetail}</ProgressSubtext>
              </ProgressCard>
            ) : null}

            {!resultsAvailable ? (
              <Animated.View style={startButtonAnimatedStyle}>
                <ScanButton disabled={loading} onPress={handleScan} activeOpacity={0.9}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ScanButtonText>start storage scan</ScanButtonText>
                  )}
                </ScanButton>
              </Animated.View>
            ) : (
              <ActionRow>
                <ActionHint>need a fresh audit?</ActionHint>
                <RescanButton disabled={loading} onPress={handleScan} activeOpacity={loading ? 1 : 0.9}>
                  <RescanButtonText>{loading ? "scanning…" : "run scan"}</RescanButtonText>
                </RescanButton>
              </ActionRow>
            )}
          </ListHeader>
        }
       showsVerticalScrollIndicator={false}
      />
    </Screen>
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