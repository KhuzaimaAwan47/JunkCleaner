import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, ListRenderItem, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styledNative, { useTheme } from "styled-components/native";

import AdPlaceholder from "../../components/AdPlaceholder";
import AppHeader from "../../components/AppHeader";
import { InstalledApp, useUnusedApps } from "../../hooks/useUnusedApps";

const styled = styledNative;

export default function UnusedAppsScreen() {
  const theme = useTheme();
  const { apps, unusedApps, isLoading, refresh } = useUnusedApps();

  const showLoader = isLoading && unusedApps.length === 0;
  const totalAppCount = useMemo(() => unusedApps.length || apps.length || 0, [apps.length, unusedApps.length]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const renderAppItem: ListRenderItem<InstalledApp> = useCallback(
    ({ item }) => {
      const iconSource = getAppIconSource(item.icon);

      return (
        <AppCard accessible accessibilityRole="button">
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
            <AppName numberOfLines={1}>{item.name}</AppName>
            <PackageName numberOfLines={1}>{item.packageName}</PackageName>
          </AppInfo>
        </AppCard>
      );
    },
    []
  );

  const headerComponent = useMemo(
    () => (
      <HeaderBlock>
        <AppHeader title={`unused apps (${totalAppCount})`} />
      </HeaderBlock>
    ),
    [totalAppCount]
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
      <Screen>
        <AppHeader title={`unused apps (${totalAppCount})`} />
        <CenteredState>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <LoaderText>scanning installed apps…</LoaderText>
        </CenteredState>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={unusedApps}
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
            refreshing={isLoading && unusedApps.length > 0}
            onRefresh={refresh}
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

const getAppIconSource = (icon?: InstalledApp["icon"]) => {
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

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const HeaderBlock = styled.View`
  padding-top: ${({ theme }) => theme.spacing.xs}px;
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const AppCard = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
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