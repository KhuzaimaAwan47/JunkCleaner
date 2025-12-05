import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import { initDatabase, loadJunkFileResults } from "../../../utils/db";
import { deleteJunkFiles, JunkFileItem } from "./JunkFileScanner";





const JunkFileScannerScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<JunkFileItem[]>([]);
  const [loading,] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [, setShowSuccess] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadJunkFileResults();
        if (savedResults.length > 0) {
          setItems(savedResults);
        }
      } catch (error) {
        console.error("Failed to load saved junk file results:", error);
      }
    };
    loadSavedResults();
  }, []);



  const totalSize = useMemo(() => items.reduce((sum, item) => sum + (item.size || 0), 0), [items]);

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    items.forEach((item) => {
      if (selectedFilePaths.has(item.path)) {
        stats.items += 1;
        stats.size += item.size || 0;
      }
    });
    return stats;
  }, [selectedFilePaths, items]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every((item) => selectedFilePaths.has(item.path));
  }, [items, selectedFilePaths]);

  const toggleFileSelection = useCallback((path: string) => {
    setSelectedFilePaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedFilePaths((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        // Deselect all
        items.forEach((item) => next.delete(item.path));
      } else {
        // Select all
        items.forEach((item) => next.add(item.path));
      }
      return next;
    });
  }, [isAllSelected, items]);

  const handleClean = useCallback(() => {
    const itemsToDelete = selectedStats.items > 0
      ? items.filter((item) => selectedFilePaths.has(item.path))
      : items;

    if (!itemsToDelete.length || clearing) {
      return;
    }
    const size = itemsToDelete.reduce((sum, item) => sum + (item.size || 0), 0);
    Alert.alert(
      "Clean Junk Files?",
      `This will permanently delete ${itemsToDelete.length} junk file${itemsToDelete.length > 1 ? "s" : ""} (${formatBytes(size)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await deleteJunkFiles(itemsToDelete);
              setShowSuccess(true);
              setTimeout(() => {
                setShowSuccess(false);
                setItems((prev) => prev.filter((item) => !itemsToDelete.some((deleted) => deleted.path === item.path)));
                setSelectedFilePaths(new Set());
              }, 2000);
            } catch (error) {
              console.warn("Clean failed", error);
              Alert.alert("Clean Failed", "Some files could not be deleted.");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [items, clearing, selectedStats.items, selectedFilePaths]);

  // Clear selection when items change
  useEffect(() => {
    setSelectedFilePaths((prev) => {
      const availablePaths = new Set(items.map((item) => item.path));
      const next = new Set<string>();
      prev.forEach((path) => {
        if (availablePaths.has(path)) {
          next.add(path);
        }
      });
      return next;
    });
  }, [items]);

  const formatModifiedDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const renderItem = useCallback<ListRenderItem<JunkFileItem>>(
    ({ item }) => {
      const isSelected = selectedFilePaths.has(item.path);
      return (
        <TouchableOpacity
          style={styles.itemWrapper}
          onPress={() => toggleFileSelection(item.path)}
          activeOpacity={0.85}
        >
          <NeumorphicContainer
            padding={theme.spacing.md}
            style={[styles.item, isSelected && styles.itemSelected]}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.path.split("/").pop() || item.path}
              </Text>
              <View style={styles.sizeRow}>
                {isSelected && (
                  <View style={styles.selectionBadge}>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
                <Text style={styles.size}>{formatBytes(item.size)}</Text>
              </View>
            </View>
            <Text style={styles.path} numberOfLines={1}>
              {item.path}
            </Text>
            <View style={styles.itemMeta}>
              <Text style={styles.badge}>{item.type}</Text>
              <Text style={styles.dateText}>{formatModifiedDate(item.modified)}</Text>
            </View>
          </NeumorphicContainer>
        </TouchableOpacity>
      );
    },
    [styles, theme, selectedFilePaths, toggleFileSelection]
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
          <AppHeader
            title="Junk Scanner"
            totalSize={items.length > 0 ? totalSize : undefined}
            totalFiles={items.length > 0 ? items.length : undefined}
            isAllSelected={items.length > 0 ? isAllSelected : undefined}
            onSelectAllPress={items.length > 0 ? toggleSelectAll : undefined}
            selectAllDisabled={items.length > 0 ? !items.length : undefined}
          />


          {items.length > 0 ? (
            <>
             
              <FlatList
                data={items}
                keyExtractor={(item) => item.path}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>no junk files detected</Text>
                  </View>
                }
              />
              {selectedStats.items > 0 && (
                <DeleteButton
                  items={selectedStats.items}
                  size={selectedStats.size}
                  disabled={clearing}
                  onPress={handleClean}
                />
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={48}
                color={theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {loading ? "scanning storage..." : "run a scan to find junk files"}
              </Text>
            </View>
          )}
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
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
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
    progressSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    successCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    successText: {
      color: theme.colors.success,
      fontSize: 18,
      fontWeight: "700",
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
      color: theme.colors.white,
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
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
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
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    selectionMetaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
    },
    selectionTextWrap: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    selectionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    selectionValue: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginTop: 4,
    },
    listContent: {
      paddingBottom: theme.spacing.sm,
    },
    itemWrapper: {
      marginBottom: theme.spacing.sm,
    },
    item: {
      borderRadius: theme.radii.lg,
      gap: theme.spacing.xs,
    },
    itemSelected: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
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
    sizeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    size: {
      color: theme.colors.accent,
      fontWeight: "700",
    },
    selectionBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0, 0, 0, 0.25)",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    itemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.xs / 2,
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
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    cleanButton: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
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

export default JunkFileScannerScreen;

