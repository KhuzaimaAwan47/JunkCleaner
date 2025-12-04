import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import SelectAll from "../../../components/SelectAll";
import formatBytes from "../../../constants/formatBytes";
import { initDatabase, loadCacheLogsResults, saveCacheLogsResults } from "../../../utils/db";
import { ScanResult, deleteFile, scanCachesAndLogs } from "./CacheLogsScanner";

const CacheLogsScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [hasDatabaseResults, setHasDatabaseResults] = useState<boolean>(false);

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadCacheLogsResults();
        setHasDatabaseResults(savedResults.length > 0);
        if (savedResults.length > 0) {
          setItems(savedResults);
        }
      } catch (error) {
        console.error("Failed to load saved cache logs results:", error);
        setHasDatabaseResults(false);
      }
    };
    loadSavedResults();
  }, []);

  const refresh = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    setSelectedFilePaths(new Set());
    try {
      const data = await scanCachesAndLogs();
      setItems(data);
      // Save results to database
      await saveCacheLogsResults(data);
      setHasDatabaseResults(data.length > 0);
    } catch (error) {
      console.warn("CacheLogs scan failed", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.size - a.size);
  }, [items]);

  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + (item.size || 0), 0), [items]);

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    sortedItems.forEach((item) => {
      if (selectedFilePaths.has(item.path)) {
        stats.items += 1;
        stats.size += item.size || 0;
      }
    });
    return stats;
  }, [selectedFilePaths, sortedItems]);

  const isAllSelected = useMemo(() => {
    return sortedItems.length > 0 && sortedItems.every((item) => selectedFilePaths.has(item.path));
  }, [sortedItems, selectedFilePaths]);

  const toggleItemSelection = useCallback((path: string) => {
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
        sortedItems.forEach((item) => next.delete(item.path));
      } else {
        // Select all
        sortedItems.forEach((item) => next.add(item.path));
      }
      return next;
    });
  }, [isAllSelected, sortedItems]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
      return;
    }
    Alert.alert(
      "Delete selected files?",
      `This will permanently delete ${selectedStats.items} file${selectedStats.items !== 1 ? 's' : ''} (${formatBytes(selectedStats.size)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              const pathsToDelete = Array.from(selectedFilePaths);
              await Promise.allSettled(pathsToDelete.map((path) => deleteFile(path)));
              // Remove deleted items from state
              const remainingItems = items.filter((item) => !selectedFilePaths.has(item.path));
              setItems(remainingItems);
              setSelectedFilePaths(new Set());
              // Update database
              await saveCacheLogsResults(remainingItems);
              setHasDatabaseResults(remainingItems.length > 0);
            } catch (error) {
              console.warn("CacheLogs deletion failed", error);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [selectedStats, selectedFilePaths, clearing, items]);

  // Clear selection when items change
  useEffect(() => {
    setSelectedFilePaths((prev) => {
      const availablePaths = new Set(sortedItems.map((item) => item.path));
      const next = new Set<string>();
      prev.forEach((path) => {
        if (availablePaths.has(path)) {
          next.add(path);
        }
      });
      return next;
    });
  }, [sortedItems]);

  const resultsAvailable = sortedItems.length > 0;

  const renderItem = useCallback(
    (item: ScanResult) => {
      const filename = item.path.split("/").pop() || item.path;
      const isSelected = selectedFilePaths.has(item.path);
      const typeIcon = item.type === "cache" ? "cached" : "file-document-outline";

      return (
        <TouchableOpacity
          key={item.path}
          style={styles.itemWrapper}
          onPress={() => toggleItemSelection(item.path)}
          activeOpacity={0.85}
        >
          <NeumorphicContainer 
            padding={theme.spacing.md}
            style={isSelected ? styles.itemSelected : undefined}
          >
            <View style={styles.itemInner}>
              <View style={styles.iconWrapper}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name={typeIcon as any}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                {isSelected && (
                  <View style={styles.selectionBadge}>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                )}
              </View>
              <View style={styles.infoColumn}>
                <View style={styles.fileHeader}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {filename}
                  </Text>
                  <Text style={styles.fileSize}>{formatBytes(item.size || 0)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={styles.tag}>{item.type}</Text>
                </View>
                <Text style={styles.path} numberOfLines={1}>
                  {item.path}
                </Text>
              </View>
            </View>
          </NeumorphicContainer>
        </TouchableOpacity>
      );
    },
    [selectedFilePaths, toggleItemSelection, theme.colors.primary, theme.colors.white, theme.spacing.md, styles]
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Cache & Logs" 
            subtitle="Find and clean cache clutter"
            totalSize={resultsAvailable ? totalBytes : undefined}
            totalFiles={resultsAvailable ? sortedItems.length : undefined}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!loading && !resultsAvailable && (
            <View style={[styles.primaryButtonContainer, styles.sectionSpacing]}>
              <TouchableOpacity style={styles.primaryButton} onPress={refresh} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>start cache scan</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={[styles.progressCard, styles.sectionSpacing]}>
              <View style={styles.progressHeader}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.progressText}>scanning cache & logs…</Text>
              </View>
              <Text style={styles.progressSubtext}>checking Android data, obb, and app caches</Text>
            </View>
          )}

          {!loading && resultsAvailable && (
            <>
              {resultsAvailable && (
                <View style={[styles.selectionMetaCard, styles.sectionSpacing]}>
                  <View style={styles.selectionTextWrap}>
                    <Text style={styles.selectionLabel}>selected</Text>
                    <Text style={styles.selectionValue}>
                      {selectedStats.items} files · {formatBytes(selectedStats.size)}
                    </Text>
                  </View>
                  <SelectAll
                    isAllSelected={isAllSelected}
                    disabled={!sortedItems.length}
                    onPress={toggleSelectAll}
                  />
                </View>
              )}

              <View style={[styles.resultsContainer, styles.sectionSpacing]}>
                {sortedItems.map((item) => renderItem(item))}
              </View>

              {!hasDatabaseResults && (
                <View style={[styles.rescanContainer, styles.sectionSpacing]}>
                  <TouchableOpacity style={styles.rescanButton} onPress={refresh} activeOpacity={0.8}>
                    <Text style={styles.rescanButtonText}>rescan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedStats.items > 0 && (
                <DeleteButton
                  items={selectedStats.items}
                  size={selectedStats.size}
                  disabled={clearing}
                  onPress={handleDelete}
                />
              )}
            </>
          )}

          {!loading && !resultsAvailable && (
            <View style={[styles.emptyCard, styles.sectionSpacing]}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={48}
                color={theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>no cache or log clutter detected</Text>
              <Text style={styles.emptySubtitle}>
                Run a scan to find cache files and logs consuming storage space
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    primaryButtonContainer: {
      marginTop: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.2)",
      shadowOpacity: theme.mode === "dark" ? 0.4 : 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      gap: theme.spacing.xs,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
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
    resultsContainer: {
      gap: theme.spacing.xs,
    },
    selectionMetaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
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
    itemWrapper: {
      marginVertical: 0,
    },
    itemInner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    itemSelected: {
      borderWidth: 1,
      borderColor: theme.colors.secondary,
    },
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    iconContainer: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
    },
    selectionBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0, 0, 0, 0.25)",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
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
      fontWeight: theme.fontWeight.bold,
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
      gap: theme.spacing.xs,
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
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    rescanContainer: {
      marginTop: theme.spacing.md,
    },
    rescanButton: {
      alignSelf: "flex-start",
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    rescanButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "uppercase",
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    emptyIcon: {
      opacity: 0.5,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
  });

export default CacheLogsScreen;

