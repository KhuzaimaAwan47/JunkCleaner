import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, ListRenderItem } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import styledComponentsNative, { useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import formatBytes from "../../../constants/formatBytes";
import {
  LargeFileResult,
  LargeFileSource,
  ScanPhase,
  scanLargeFiles,
} from "./LargeFileScanner";

const styled = styledComponentsNative;

type SourceFilter = LargeFileSource | "all";
type ProgressPhase = ScanPhase | "idle";

const LargeFilesScreen: React.FC = () => {
  const theme = useTheme();
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
    [recordThumbnailError, theme.colors.textMuted, thumbnailFallbacks],
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

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const ListHeader = styled.View`
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

const SummaryRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

const SummarySlot = styled.View<{ isLast?: boolean }>`
  flex: 1;
  margin-right: ${({ isLast, theme }) => (isLast ? 0 : theme.spacing.sm)}px;
`;

const SummaryCard = styled.View`
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
`;

const SummaryIcon = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => `${theme.colors.primary}15`};
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const SummaryValue = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const SummaryLabel = styled.Text`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
  text-transform: uppercase;
`;

const ProgressCard = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}33`};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
`;

const ProgressHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const ProgressText = styled.Text`
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ProgressPercent = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const ProgressSubtext = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

const ScanButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  paddingVertical: ${({ theme }) => theme.spacing.md + 2}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const ScanButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ActionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const ActionHint = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const RescanButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  paddingVertical: ${({ theme }) => theme.spacing.sm}px;
  paddingHorizontal: ${({ theme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.primary};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const RescanButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-transform: uppercase;
`;

const FileCard = styled.View`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
`;

const FileRow = styled.View`
  flex-direction: row;
`;

const ThumbnailWrapper = styled.View`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  overflow: hidden;
  margin-right: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}77`};
  align-items: center;
  justify-content: center;
`;

const ThumbnailImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const ThumbnailFallback = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const FileContent = styled.View`
  flex: 1;
`;

const FileHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const FileName = styled.Text`
  flex: 1;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const FileSize = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
`;

const BadgeRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
`;

const Tag = styled.Text<{ accent?: boolean }>`
  padding: 4px ${({ theme }) => theme.spacing.sm}px;
  border-radius: 999px;
  margin-right: ${({ theme }) => theme.spacing.xs}px;
  margin-bottom: ${({ theme }) => theme.spacing.xs / 2}px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: ${({ accent, theme }) => (accent ? `${theme.colors.primary}22` : `${theme.colors.surfaceAlt}55`)};
  color: ${({ accent, theme }) => (accent ? theme.colors.primary : theme.colors.text)};
`;

const MetaText = styled.Text`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PathText = styled.Text`
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

export default LargeFilesScreen;