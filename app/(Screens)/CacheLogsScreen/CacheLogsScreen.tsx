import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import ScreenWrapper from "../../../components/ScreenWrapper";
import ThemedList from "../../../components/ThemedList";
import { ScanResult, clearAll, scanCachesAndLogs } from "./CacheLogsScanner";

const formatSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return `${kb.toFixed(kb > 100 ? 0 : 1)} KB`;
};

const CacheLogsScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scanCachesAndLogs();
      setItems(data);
    } catch (error) {
      console.warn("CacheLogs scan failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClearAll = useCallback(() => {
    if (!items.length || clearing) {
      return;
    }
    Alert.alert(
      "Clear all cache & logs?",
      "This will permanently delete the detected files.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await clearAll(items);
              await refresh();
            } catch (error) {
              console.warn("CacheLogs clearance failed", error);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [items, clearing, refresh]);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + (item.size || 0), 0),
    [items]
  );

  const renderItem = useCallback(
    ({ item }: { item: ScanResult }) => (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.path.split("/").pop()}
          </Text>
          <Text style={styles.size}>{formatSize(item.size)}</Text>
        </View>
        <Text style={styles.path} numberOfLines={1}>
          {item.path}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.badge}>{item.type}</Text>
        </View>
      </View>
    ),
    [styles]
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
        <AppHeader title="Cache & Logs" />

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>fast cache cleanup</Text>
            <Text style={styles.heroSubtitle}>
              Deep scan Android data, obb, and app caches for wasteful logs.
            </Text>
          </View>

          <Pressable
            onPress={refresh}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
              loading && styles.scanButtonDisabled,
            ]}
            disabled={loading}
          >
            <Text style={styles.scanButtonText}>
              {loading ? "Scanning..." : "Rescan Storage"}
            </Text>
          </Pressable>

          {loading && (
            <ActivityIndicator
              style={styles.spinner}
              color={theme.colors.accent}
            />
          )}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>files found</Text>
            <Text style={styles.metricValue}>{items.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>total size</Text>
            <Text style={styles.metricValue}>{formatSize(totalSize)}</Text>
          </View>
        </View>

        <View style={styles.resultsCard}>
          <ThemedList
            data={items}
            keyExtractor={(item) => item.path}
            renderItem={renderItem}
            title="detected cache & logs"
            subtitle={
              items.length ? "sorted by largest first" : "run a scan to monitor storage health"
            }
            loading={loading}
            emptyText="no cache or log clutter detected right now."
          />
          <Pressable
            onPress={handleClearAll}
            disabled={!items.length || clearing}
            style={[
              styles.clearButton,
              (!items.length || clearing) && styles.scanButtonDisabled,
            ]}
          >
            <Text style={styles.scanButtonText}>
              {clearing ? "Clearing..." : "Clear All"}
            </Text>
          </Pressable>
        </View>
      </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
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
    },
    heroHeader: {
      gap: theme.spacing.sm,
    },
    heroTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    scanButton: {
      marginTop: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
    scanButtonPressed: {
      opacity: 0.9,
    },
    scanButtonDisabled: {
      opacity: 0.6,
    },
    scanButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    spinner: {
      marginTop: theme.spacing.sm,
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
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginTop: theme.spacing.xs / 2,
    },
    resultsCard: {
      flex: 1,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    item: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      gap: theme.spacing.xs,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    fileName: {
      flex: 1,
      marginRight: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: "600",
    },
    size: {
      color: theme.colors.accent,
      fontWeight: "700",
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    itemMeta: {
      flexDirection: "row",
      justifyContent: "flex-start",
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.primary}22`,
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    clearButton: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
  });

export default CacheLogsScreen;

