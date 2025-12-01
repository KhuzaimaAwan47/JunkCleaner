import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ListRenderItem,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import formatBytes from "../../../constants/formatBytes";
import { ApkFile, deleteApkFile, scanForAPKs } from "./APKScanner";

const APKsRemoverScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [apkFiles, setApkFiles] = useState<ApkFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const scan = useCallback(async () => {
    setLoading(true);
    setApkFiles([]);
    try {
      const result = await scanForAPKs();
      setApkFiles(result);
    } catch (error) {
      console.warn("APK scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for APK files. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const totalSize = useMemo(() => apkFiles.reduce((sum, item) => sum + (item.size || 0), 0), [apkFiles]);

  const handleDelete = useCallback(
    async (file: ApkFile) => {
      Alert.alert(
        "Delete APK?",
        `This will permanently delete ${file.name} (${formatBytes(file.size)}).`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setDeleting((prev) => new Set(prev).add(file.path));
              try {
                await deleteApkFile(file.path);
                setApkFiles((prev) => prev.filter((item) => item.path !== file.path));
              } catch (error) {
                console.warn("Delete failed", error);
                Alert.alert("Delete Failed", "Unable to delete the file.");
              } finally {
                setDeleting((prev) => {
                  const next = new Set(prev);
                  next.delete(file.path);
                  return next;
                });
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback<ListRenderItem<ApkFile>>(
    ({ item }) => {
      const isDeleting = deleting.has(item.path);
      return (
        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <MaterialCommunityIcons
              name="package-variant"
              size={24}
              color={theme.colors.primary}
              style={styles.fileIcon}
            />
            <View style={styles.itemContent}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.path} numberOfLines={1}>
                {item.path}
              </Text>
              <Text style={styles.size}>{formatBytes(item.size)}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
            style={[
              styles.deleteButton,
              isDeleting && styles.deleteButtonDisabled,
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <MaterialCommunityIcons name="delete" size={20} color={theme.colors.background} />
            )}
          </Pressable>
        </View>
      );
    },
    [styles, theme, deleting, handleDelete]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <AppHeader title="APK Remover" />

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>ultra-fast APK scanner</Text>
            <Text style={styles.heroSubtitle}>
              Scan and remove APK installer files to free up storage space.
            </Text>
          </View>

          {loading ? (
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.progressText}>Scanning...</Text>
            </View>
          ) : (
            <Pressable
              onPress={scan}
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.scanButtonPressed,
                loading && styles.scanButtonDisabled,
              ]}
              disabled={loading}
            >
              <Text style={styles.scanButtonText}>
                {apkFiles.length > 0 ? "Rescan APK Files" : "Scan APK Files"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>files found</Text>
            <Text style={styles.metricValue}>{apkFiles.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>total size</Text>
            <Text style={styles.metricValue}>{formatBytes(totalSize)}</Text>
          </View>
        </View>

        <View style={styles.resultsCard}>
          {apkFiles.length > 0 ? (
            <FlatList
              data={apkFiles}
              keyExtractor={(item) => item.path}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={48}
                color={theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {loading ? "scanning storage..." : "run a scan to find APK files"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

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
      fontSize: 20,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    progressCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    progressText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginTop: theme.spacing.xs,
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
    },
    listContent: {
      paddingBottom: theme.spacing.sm,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: theme.spacing.sm,
    },
    fileIcon: {
      marginRight: theme.spacing.xs,
    },
    itemContent: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    size: {
      color: theme.colors.accent,
      fontSize: 13,
      fontWeight: "600",
      marginTop: theme.spacing.xs / 2,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonDisabled: {
      opacity: 0.6,
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
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },
  });

export default APKsRemoverScreen;
