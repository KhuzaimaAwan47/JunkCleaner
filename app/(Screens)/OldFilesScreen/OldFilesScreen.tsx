import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import { homeScreenStyles } from "../../../styles/GlobalStyles";
import { OldFileInfo, scanOldFiles } from "./OldFilesScanner";

const { Screen, Content } = homeScreenStyles;

const formatSize = (bytes: number) => {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

const getFileName = (path: string) => path.split("/").filter(Boolean).pop() ?? path;

const OldFilesScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [oldFiles, setOldFiles] = useState<OldFileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleScan = useCallback(async () => {
    setLoading(true);
    try {
      const files = await scanOldFiles(30);
      setOldFiles(files);
    } catch (error) {
      console.warn("OldFiles scan failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OldFileInfo }) => (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text numberOfLines={1} style={styles.fileName}>
            {getFileName(item.path)}
          </Text>
          <Text style={styles.size}>{formatSize(item.size)}</Text>
        </View>
        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>{formatDate(item.modifiedDate)}</Text>
          <Text style={styles.metaText}>{item.ageDays} days old</Text>
        </View>
      </View>
    ),
    [styles]
  );

  return (
    <Screen>
      <Content style={styles.content}>
        <AppHeader title="Old Files" />

        <View style={styles.heroCard}>
          <Pressable
            onPress={handleScan}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
              loading && styles.scanButtonDisabled,
            ]}
            disabled={loading}
          >
            <Text style={styles.scanButtonText}>
              {loading ? "Scanning..." : "Scan Old Files"}
            </Text>
          </Pressable>

          {loading && <ActivityIndicator style={styles.spinner} color={theme.colors.accent} />}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>scan results</Text>
          <Text style={styles.resultsSubtitle}>
            {oldFiles.length ? "sorted by oldest first" : "start a scan to inspect storage"}
          </Text>
        </View>

        <FlatList
          data={oldFiles}
          keyExtractor={(item) => item.path}
          renderItem={renderItem}
          contentContainerStyle={oldFiles.length ? styles.listContent : styles.emptyState}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>tap “Scan Old Files” to analyze your storage.</Text>
            ) : null
          }
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Content>
    </Screen>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    content: {
      flex: 1,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    heroCard: {
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
    },
    scanButton: {
      marginTop: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    scanButtonPressed: {
      opacity: 0.9,
    },
    scanButtonDisabled: {
      opacity: 0.65,
    },
    scanButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    spinner: {
      marginTop: theme.spacing.sm,
    },
    resultsHeader: {
      gap: theme.spacing.xs,
    },
    resultsTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    resultsSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    list: {
      flex: 1,
    },
    listContent: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    emptyState: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing.xl,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: "center",
    },
    item: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs / 2,
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
    itemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
  });

export default OldFilesScreen;
