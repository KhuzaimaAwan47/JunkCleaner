import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import { initDatabase, loadJunkFileResults } from "../../../utils/db";
import { deleteJunkFiles, JunkFileItem } from "./JunkFileScanner";

const PREVIEWABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.mp4', '.mov'];





const JunkFileScannerScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<JunkFileItem[]>([]);
  const [loading,] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [, setShowSuccess] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState<Record<string, boolean>>({});

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

  const deleteDisabled = selectedStats.items === 0;

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

  const formatModifiedDate = useCallback((timestamp: number): string => {
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
  }, []);

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => {
      if (prev[path]) {
        return prev;
      }
      return { ...prev, [path]: true };
    });
  }, []);

  const getFileIcon = useCallback((path: string, type: string): string => {
    const lower = path.toLowerCase();
    
    // Image files
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/)) {
      return 'image';
    }
    
    // Video files
    if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/)) {
      return 'video';
    }
    
    // Audio files
    if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) {
      return 'music';
    }
    
    // Documents
    if (lower.endsWith('.pdf')) return 'file-pdf-box';
    if (lower.match(/\.(doc|docx)$/)) return 'file-word-box';
    if (lower.match(/\.(xls|xlsx)$/)) return 'file-excel-box';
    if (lower.match(/\.(ppt|pptx)$/)) return 'file-powerpoint-box';
    if (lower.endsWith('.txt')) return 'file-document-outline';
    if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'folder-zip';
    
    // Junk file types
    if (type === 'cache') return 'cached';
    if (type === 'temp' || type === 'log') return 'file-outline';
    
    return 'file-outline';
  }, []);

  const isPreviewableMedia = useCallback((path: string): boolean => {
    const lower = path.toLowerCase();
    return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }, []);

  const getFilename = useCallback((path: string): string => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.md,
      paddingBottom: !deleteDisabled && items.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
    }),
    [theme.spacing.xl, theme.spacing.md, deleteDisabled, items.length],
  );

  const renderItem = useCallback<ListRenderItem<JunkFileItem>>(
    ({ item }) => {
      const filename = getFilename(item.path);
      const previewable = isPreviewableMedia(item.path) && !thumbnailFallbacks[item.path];
      const isActive = selectedFilePaths.has(item.path);
      const iconName = getFileIcon(item.path, item.type);
      const showThumbnail = previewable && (item.path.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|mp4|mov)$/i));
      
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.fileRow, isActive && styles.fileRowSelected]}
          onPress={() => toggleFileSelection(item.path)}
        >
          <View style={styles.thumbWrapper}>
            {showThumbnail ? (
              <Image
                source={{ uri: item.path }}
                resizeMode="cover"
                style={styles.thumbnailImage}
                onError={() => recordThumbnailError(item.path)}
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={40}
                  color={theme.colors.textMuted}
                />
              </View>
            )}
            {isActive ? (
              <View style={styles.selectionBadge}>
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
              </View>
            ) : null}
          </View>
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>{filename}</Text>
            <View style={styles.fileMetaRow}>
              <Text style={styles.badge}>{item.type}</Text>
              <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
            </View>
            <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
            <Text style={styles.dateText}>{formatModifiedDate(item.modified)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [thumbnailFallbacks, selectedFilePaths, theme.colors.textMuted, theme.colors.white, toggleFileSelection, recordThumbnailError, getFilename, isPreviewableMedia, getFileIcon, formatModifiedDate, styles],
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
                contentContainerStyle={listContentInset}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>no junk files detected</Text>
                  </View>
                }
                ListFooterComponent={<View style={styles.footerSpacer} />}
              />
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
        {!deleteDisabled && items.length > 0 && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.items}
              size={selectedStats.size}
              disabled={clearing}
              onPress={handleClean}
            />
          </View>
        )}
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
    footerSpacer: {
      height: theme.spacing.xl,
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      marginTop: theme.spacing.sm,
    },
    fileRowSelected: {
      borderColor: theme.colors.primary,
    },
    thumbWrapper: {
      width: 60,
      height: 60,
      borderRadius: theme.radii.lg,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
      position: "relative",
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
    },
    thumbnailFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    fileMeta: {
      flex: 1,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    fileMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: 4,
    },
    fileSize: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 2,
    },
    selectionBadge: {
      position: "absolute",
      top: 6,
      right: 6,
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
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.primary}22`,
      color: theme.colors.primary,
      fontSize: 11,
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
    fixedDeleteButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
  });

export default JunkFileScannerScreen;

