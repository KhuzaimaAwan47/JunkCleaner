import { Image } from "expo-image";
import * as IntentLauncher from "expo-intent-launcher";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Linking, Platform, StyleSheet, Text, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Banner,
  Chip,
  Snackbar,
} from "react-native-paper";

import { layout, palette, typography } from "../../constants/theme";
import { InstalledApp, useInstalledApps } from "../../hooks/useInstalledApps";

const DAYS_IDLE_THRESHOLD = 45;

export default function UnusedAppsScreen() {
  const router = useRouter();
  const { apps: installedApps, unusedApps, hasUsageStats, isLoading, refresh, needsUsagePermission } = useInstalledApps();
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const isAndroid = Platform.OS === "android";

  const displayedApps = hasUsageStats ? unusedApps : installedApps;

  const summary = useMemo(() => {
    return {
      totalUnused: displayedApps.length,
    };
  }, [displayedApps]);

  const handleOpenUsageSettings = useCallback(async () => {
    if (!isAndroid) {
      return;
    }

    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.USAGE_ACCESS_SETTINGS);
      setSnackbarMessage("open settings → usage access → enable junkcleaner for accurate idle data.");
    } catch {
      try {
        await Linking.openSettings();
        setSnackbarMessage("open settings → special access → usage access, then enable for junkcleaner");
      } catch {
        setSnackbarMessage("unable to open settings");
      }
    }
  }, [isAndroid]);


  const showLoader = isLoading && displayedApps.length === 0;

  const showPermissionBanner = isAndroid && needsUsagePermission;

  const permissionAlertShown = useRef(false);

  React.useEffect(() => {
    if (!showPermissionBanner) {
      permissionAlertShown.current = false;
      return;
    }

    if (permissionAlertShown.current) {
      return;
    }

    permissionAlertShown.current = true;

    Alert.alert(
      "allow usage access",
      "junkcleaner needs usage access to mark which apps haven't been used recently. tap open settings, then enable junkcleaner in the usage access list.",
      [
        { text: "later", style: "cancel" },
        { text: "open settings", onPress: handleOpenUsageSettings },
      ]
    );
  }, [handleOpenUsageSettings, showPermissionBanner]);

  const renderAppItem = useCallback(
    ({ item }: { item: InstalledApp }) => {
      const iconSource =
        item.icon && (item.icon.startsWith("data:") || item.icon.startsWith("file://") || item.icon.startsWith("http"))
          ? { uri: item.icon }
          : item.icon
          ? { uri: `data:image/png;base64,${item.icon}` }
          : null;

      const daysIdle = item.daysIdle ?? 0;
      const idleCopy =
        hasUsageStats && item.daysIdle !== null && item.daysIdle !== undefined
          ? `${daysIdle} days idle`
          : "usage data pending";

      return (
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.iconWrapper}>
              {iconSource ? (
                <Image source={iconSource} style={styles.appIcon} contentFit="cover" transition={200} />
              ) : (
                <Avatar.Text
                  size={52}
                  label={item.name.slice(0, 2).toUpperCase()}
                  style={styles.avatar}
                  color={palette.background}
                />
              )}
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.packageName} numberOfLines={1} ellipsizeMode="tail">
                {item.packageName}
              </Text>
              <View style={styles.metaRow}>
                <Chip
                  mode="flat"
                  compact
                  icon="clock-outline"
                  textStyle={[styles.chipText, styles.idleChipText]}
                  style={[styles.metaChip, styles.idleChip]}
                >
                  {idleCopy}
                </Chip>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [hasUsageStats]
  );


  return (
    <LinearGradient
      colors={["#0a0f0a", "#071008", "#050c05"]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} color={palette.textPrimary} />
        <Appbar.Content title="Unused Apps" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      {showPermissionBanner && (
        <Banner
          visible={showPermissionBanner}
          icon="shield-alert"
          actions={[{ label: "open settings", onPress: handleOpenUsageSettings }]}
          style={styles.permissionBanner}
        >
          allow usage access for junkcleaner in system settings to detect unused apps based on last usage date.
        </Banner>
      )}

      {showLoader ? (
        <View style={styles.loader}>
          <ActivityIndicator animating color={palette.accent} />
          <Text style={styles.loaderText}>loading unused apps…</Text>
        </View>
      ) : (
        <FlatList
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.listSpacer} />}
          ListHeaderComponent={() => (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>unused apps</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{summary.totalUnused}</Text>
                  <Text style={styles.summaryLabel}>inactive apps</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{hasUsageStats ? `${DAYS_IDLE_THRESHOLD}+` : "—"}</Text>
                  <Text style={styles.summaryLabel}>{hasUsageStats ? "days idle" : "usage data pending"}</Text>
                </View>
              </View>
            </View>
          )}
          refreshing={isLoading && displayedApps.length > 0}
          onRefresh={refresh}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>no unused apps found</Text>
              <Text style={styles.emptySubtitle}>
                {needsUsagePermission && isAndroid
                  ? "allow usage access for junkcleaner in android settings so we can calculate when an app was last used."
                  : "all your apps have been used recently, or usage data is still syncing."}
              </Text>
            </View>
          )}
          renderItem={renderAppItem}
          data={displayedApps}
        />
      )}

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={2400}
        style={styles.snackbar}
        action={{ label: "close", textColor: palette.accent, onPress: () => setSnackbarMessage(null) }}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  appbar: {
    backgroundColor: "transparent",
    elevation: 0,
  },
  appbarTitle: {
    ...typography.subheading,
    color: palette.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    ...typography.caption,
    color: palette.textSecondary,
    letterSpacing: 0.6,
  },
  listContent: {
    paddingHorizontal: layout.spacing.lg,
    paddingVertical: layout.spacing.md,
    flexGrow: 1,
    paddingBottom: layout.spacing.xl,
  },
  listSpacer: {
    height: layout.spacing.md,
  },
  summaryCard: {
    backgroundColor: palette.card,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: layout.cardPadding,
    marginBottom: layout.spacing.lg,
    gap: layout.spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    ...typography.subheading,
    color: palette.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryButton: {
    borderRadius: 999,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.spacing.md,
  },
  summaryStat: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: palette.surface,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: layout.spacing.sm,
    paddingHorizontal: layout.spacing.md,
  },
  summaryValue: {
    ...typography.subheading,
    fontSize: 20,
    color: palette.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    ...typography.caption,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
  },
  itemCard: {
    backgroundColor: palette.card,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: layout.cardPadding,
    gap: layout.spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    gap: layout.spacing.md,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  appIcon: {
    width: "100%",
    height: "100%",
  },
  avatar: {
    backgroundColor: palette.accent,
  },
  itemText: {
    flex: 1,
    gap: layout.spacing.xs,
  },
  itemName: {
    ...typography.subheading,
    color: palette.textPrimary,
  },
  packageName: {
    ...typography.caption,
    color: palette.textSecondary,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: layout.spacing.xs,
  },
  metaChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
  },
  chipText: {
    ...typography.caption,
    color: palette.textPrimary,
    letterSpacing: 0.4,
    textTransform: "none",
  },
  idleChip: {
    backgroundColor: "#F062921A",
    borderColor: "#F0629233",
  },
  idleChipText: {
    color: "#F06292",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    ...typography.subheading,
    color: palette.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptySubtitle: {
    ...typography.caption,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  permissionBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${palette.accent}30`,
  },
  snackbar: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  snackbarText: {
    ...typography.caption,
    color: palette.textPrimary,
  },
});


