import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, InteractionManager, ListRenderItem, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styledNative, { useTheme } from "styled-components/native";

import AdPlaceholder from "../../../components/AdPlaceholder";
import AppHeader from "../../../components/AppHeader";
import formatBytes from "../../../constants/formatBytes";
import { scanUnusedApps, UnusedApp } from "./UnusedAppsScanner";

const styled = styledNative;

type SortMode = "unused" | "oldest";

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "unused", label: "most unused first" },
  { mode: "oldest", label: "oldest launch first" },
];

export default function UnusedAppsScreen() {
  const theme = useTheme();
  const [apps, setApps] = useState<UnusedApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("unused");
  const [error, setError] = useState<string | null>(null);

  const sortedApps = useMemo(() => sortApps(apps, sortMode), [apps, sortMode]);
  const showLoader = loading && apps.length === 0;

  const runScan = useCallback(() => {
    setLoading(true);
    setError(null);

    InteractionManager.runAfterInteractions(() => {
      scanUnusedApps()
        .then((result) => {
          setApps(result);
        })
        .catch((err) => {
          console.warn("unused apps scan failed", err);
          setError("unable to scan right now. please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const totalAppCount = useMemo(() => sortedApps.length, [sortedApps]);
  const totalSize = useMemo(
    () => sortedApps.reduce((sum, app) => sum + (app.appSizeBytes ?? 0), 0),
    [sortedApps]
  );
  const totalCacheSize = useMemo(
    () => sortedApps.reduce((sum, app) => sum + (app.cacheSize ?? 0), 0),
    [sortedApps]
  );

  const keyExtractor = useCallback((item: UnusedApp) => item.packageName, []);

  const renderAppItem: ListRenderItem<UnusedApp> = useCallback(
    ({ item }) => {
      const iconSource = getAppIconSource(item.icon);
      const lastUsedLabel = formatLastUsed(item.lastUsed);
      const appSize = item.appSizeBytes ? formatBytes(item.appSizeBytes) : null;
      const cacheSize = item.cacheSize ? formatBytes(item.cacheSize) : null;
      const dataUsage = item.dataUsageBytes ? formatBytes(item.dataUsageBytes) : null;
      const launchCount = item.launchCount ?? null;
      const foregroundTime = item.totalForegroundTime
        ? formatForegroundTime(item.totalForegroundTime)
        : null;

      return (
        <AppCard>
          <AppCardContent>
            <IconWrapper>
              {iconSource ? (
                <Image source={iconSource} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
              ) : (
                <FallbackBubble>
                  <FallbackInitials>{item.name.slice(0, 2).toUpperCase()}</FallbackInitials>
                </FallbackBubble>
              )}
            </IconWrapper>
            <AppInfo>
              <AppHeaderRow>
                <AppName numberOfLines={1}>{item.name}</AppName>
                <ScoreBubble>
                  <ScoreLabel>{item.unusedScore.toFixed(1)}</ScoreLabel>
                </ScoreBubble>
              </AppHeaderRow>
              <PackageName numberOfLines={1}>{item.packageName}</PackageName>
              <MetaRow>
                <MetaText>{lastUsedLabel}</MetaText>
                {launchCount !== null && <MetaText>• {launchCount} launches</MetaText>}
              </MetaRow>
              <MetricsRow>
                {appSize && <MetricChip><MetricText>{appSize}</MetricText></MetricChip>}
                {cacheSize && <MetricChip><MetricText>{cacheSize} cache</MetricText></MetricChip>}
                {dataUsage && <MetricChip><MetricText>{dataUsage}</MetricText></MetricChip>}
                {foregroundTime && <MetricChip><MetricText>{foregroundTime}</MetricText></MetricChip>}
              </MetricsRow>
              <BadgeRow>
                {item.isSystemApp && <SystemBadge><BadgeText>system</BadgeText></SystemBadge>}
                {item.foregroundServicePresent && (
                  <ServiceBadge><BadgeText>foreground service</BadgeText></ServiceBadge>
                )}
              </BadgeRow>
            </AppInfo>
          </AppCardContent>
        </AppCard>
      );
    },
    []
  );

  const headerComponent = useMemo(
    () => (
      <HeaderBlock>
        <AppHeader title={`unused apps (${totalAppCount})`} subtitle="apps with low usage patterns" />
        <HeaderMetricsRow>
          <MetricCard>
            <MetricLabel>apps</MetricLabel>
            <MetricValue>{totalAppCount}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>total size</MetricLabel>
            <MetricValue>{formatBytes(totalSize)}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>cache</MetricLabel>
            <MetricValue>{formatBytes(totalCacheSize)}</MetricValue>
          </MetricCard>
        </HeaderMetricsRow>
        <HeaderActions>
          <SortRow>
            {SORT_OPTIONS.map((option) => (
              <SortButton
                key={option.mode}
                activeOpacity={0.8}
                onPress={() => setSortMode(option.mode)}
                $active={sortMode === option.mode}
              >
                <SortLabel $active={sortMode === option.mode}>{option.label}</SortLabel>
              </SortButton>
            ))}
          </SortRow>
          <RefreshButton activeOpacity={0.8} onPress={runScan}>
            <RefreshLabel>refresh</RefreshLabel>
          </RefreshButton>
        </HeaderActions>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </HeaderBlock>
    ),
    [error, runScan, sortMode, totalAppCount, totalSize, totalCacheSize]
  );

  const footerComponent = useMemo(
    () => (
      <FooterBlock>
        <FooterText>pro tip: keep your essentials, remove the rest.</FooterText>
        <AdPlaceholder />
      </FooterBlock>
    ),
    []
  );

  if (showLoader) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <AppHeader title={`unused apps (${totalAppCount})`} />
        <CenteredState>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <LoaderText>scanning installed apps…</LoaderText>
        </CenteredState>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <FlatList
        data={sortedApps}
        keyExtractor={keyExtractor}
        renderItem={renderAppItem}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            refreshing={loading && apps.length > 0}
            onRefresh={runScan}
          />
        }
        ListEmptyComponent={
          <EmptyState>
            <EmptyTitle>no unused apps detected</EmptyTitle>
            <EmptySubtitle>
              every installed app looks active for now. try scanning again later after regular usage.
            </EmptySubtitle>
          </EmptyState>
        }
      />
    </Screen>
  );
}

const MILLIS_PER_DAY = 86_400_000;

const getAppIconSource = (icon?: UnusedApp["icon"]) => {
  if (!icon || typeof icon !== "string") {
    return null;
  }

  const trimmedIcon = icon.trim();

  if (
    trimmedIcon.startsWith("data:") ||
    trimmedIcon.startsWith("file://") ||
    trimmedIcon.startsWith("content://") ||
    trimmedIcon.startsWith("http")
  ) {
    return { uri: trimmedIcon };
  }

  return { uri: `data:image/png;base64,${trimmedIcon}` };
};

function formatLastUsed(lastUsed: number | null) {
  if (!lastUsed || lastUsed === 0) {
    return "never opened";
  }

  const diff = Date.now() - lastUsed;
  if (diff < 60 * 60 * 1000) {
    return "opened under an hour ago";
  }

  const days = Math.floor(diff / MILLIS_PER_DAY);
  if (days === 0) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "1 day ago";
  }

  if (days < 30) {
    return `${days} days ago`;
  }

  return new Date(lastUsed).toLocaleDateString();
}

function formatForegroundTime(ms: number): string {
  if (ms < 60 * 1000) {
    return `${Math.floor(ms / 1000)}s`;
  }
  if (ms < 60 * 60 * 1000) {
    return `${Math.floor(ms / (60 * 1000))}m`;
  }
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function sortApps(apps: UnusedApp[], mode: SortMode) {
  if (mode === "oldest") {
    return [...apps].sort((a, b) => {
      const aLast = a.lastUsed ?? 0;
      const bLast = b.lastUsed ?? 0;
      return aLast - bLast;
    });
  }

  return [...apps].sort((a, b) => b.unusedScore - a.unusedScore);
}

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const HeaderBlock = styled.View`
  padding-top: ${({ theme }) => theme.spacing.xs}px;
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const HeaderMetricsRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const MetricCard = styled.View`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const MetricLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  text-transform: uppercase;
`;

const MetricValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const HeaderActions = styled.View`
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const SortRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const SortButton = styled(TouchableOpacity)<{ $active: boolean }>`
  flex: 1;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radii.xl}px;
  border-width: 1px;
  border-color: ${({ theme, $active }) => ($active ? theme.colors.primary : `${theme.colors.surfaceAlt}66`)};
  background-color: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surface)};
`;

const SortLabel = styled.Text<{ $active: boolean }>`
  text-align: center;
  text-transform: lowercase;
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
`;

const RefreshButton = styled(TouchableOpacity)`
  align-self: flex-start;
  padding-vertical: ${({ theme }) => theme.spacing.xs}px;
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: ${({ theme }) => `${theme.colors.primary}22`};
`;

const RefreshLabel = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  text-transform: lowercase;
  font-size: 13px;
`;

const ErrorText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 12px;
  text-transform: lowercase;
`;

const AppCard = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
  overflow: hidden;
`;

const AppCardContent = styled.View`
  flex-direction: row;
  padding: ${({ theme }) => theme.spacing.md}px;
`;

const IconWrapper = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}80`};
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceAlt};
`;

const FallbackBubble = styled.View`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => `${theme.colors.primary}33`};
`;

const FallbackInitials = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: 16px;
`;

const AppInfo = styled.View`
  flex: 1;
  margin-left: ${({ theme }) => theme.spacing.md}px;
  gap: 4px;
`;

const AppHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const MetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
  margin-top: 2px;
`;

const MetaText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  text-transform: lowercase;
`;

const MetricsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs}px;
  margin-top: 4px;
`;

const MetricChip = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing.xs}px;
  padding-vertical: 2px;
  border-radius: 6px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}66`};
`;

const MetricText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  text-transform: lowercase;
`;

const BadgeRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs}px;
  margin-top: 4px;
`;

const SystemBadge = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing.xs}px;
  padding-vertical: 2px;
  border-radius: 6px;
  background-color: ${({ theme }) => `${theme.colors.accent}22`};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.accent}55`};
`;

const ServiceBadge = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing.xs}px;
  padding-vertical: 2px;
  border-radius: 6px;
  background-color: ${({ theme }) => `${theme.colors.primary}22`};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.primary}55`};
`;

const BadgeText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 10px;
  font-weight: 600;
  text-transform: lowercase;
`;

const ScoreBubble = styled.View`
  min-width: 40px;
  min-height: 24px;
  padding-horizontal: ${({ theme }) => theme.spacing.xs}px;
  border-radius: 999px;
  background-color: ${({ theme }) => `${theme.colors.primary}22`};
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.primary}55`};
`;

const ScoreLabel = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  font-size: 12px;
`;

const AppName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const PackageName = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  margin-top: 2px;
`;

const EmptyState = styled.View`
  padding: ${({ theme }) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const EmptyTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  text-transform: capitalize;
`;

const EmptySubtitle = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  text-align: center;
  line-height: 18px;
`;

const CenteredState = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding-bottom: ${({ theme }) => theme.spacing.xl}px;
`;

const LoaderText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  letter-spacing: 0.3px;
`;

const FooterBlock = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const FooterText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  text-align: center;
`;