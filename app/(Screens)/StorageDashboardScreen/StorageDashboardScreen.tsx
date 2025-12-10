import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { useSelector } from "react-redux";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import CircularStorageIndicator from "../../../components/CircularStorageIndicator";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ResultStatCard from "../../../components/ResultStatCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import {
  initDatabase,
  loadApkScanResults,
  loadCacheLogsResults,
  loadDuplicateGroups,
  loadJunkFileResults,
  loadLargeFileResults,
  loadOldFileResults,
  loadWhatsAppResults,
} from "../../../utils/db";
import type { RootState } from "../../../redux-code/store";
import type { ApkFile } from "../APKRemoverScreen/APKScanner";
import type { ScanResult } from "../CacheLogsScreen/CacheLogsScanner";
import type { DuplicateGroup } from "../DuplicateImagesScreen/DuplicateImageScanner";
import type { JunkFileItem } from "../JunkFileScannerScreen/JunkFileScanner";
import type { LargeFileResult } from "../LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../OldFilesScreen/OldFilesScanner";
import type { WhatsAppScanResult } from "../WhatsAppRemoverScreen/WhatsAppScanner";

type FileCategory = {
  name: string;
  icon: string;
  size: number;
  count: number;
  color: string;
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    Images: "image-multiple",
    Videos: "video",
    Documents: "file-document",
    Audio: "music",
    Apps: "android",
    Archives: "folder-zip",
    Cache: "cached",
    System: "cog",
    Other: "file-outline",
  };
  return icons[category] || "file-outline";
};

const getCategoryColor = (category: string, theme: DefaultTheme): string => {
  const colors: Record<string, string> = {
    Images: "#4CAF50",
    Videos: "#F44336",
    Documents: "#2196F3",
    Audio: "#9C27B0",
    Apps: "#00D1FF",
    Archives: "#FF9800",
    Cache: theme.colors.accent,
    System: theme.colors.textMuted,
    Other: theme.colors.textMuted,
  };
  return colors[category] || theme.colors.textMuted;
};

const categorizeFile = (path: string, type?: string): string => {
  const lower = path.toLowerCase();
  
  // Check for specific types first
  if (type === "cache" || type === "log" || type === "temp") return "Cache";
  if (type === "Images" || lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) return "Images";
  if (type === "Video" || lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) return "Videos";
  if (type === "Documents" || lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) return "Documents";
  if (type === "Audio" || type === "VoiceNotes" || lower.match(/\.(mp3|wav|flac|aac|m4a|ogg|wma)$/)) return "Audio";
  if (lower.endsWith(".apk")) return "Apps";
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) return "Archives";
  if (lower.includes("system") || lower.includes("android/data") || lower.includes("android/obb")) return "System";
  
  return "Other";
};

const categorizeAllFiles = (
  apkResults: ApkFile[],
  whatsappResults: WhatsAppScanResult[],
  largeFileResults: LargeFileResult[],
  junkFileResults: JunkFileItem[],
  oldFileResults: OldFileInfo[],
  cacheLogsResults: ScanResult[],
  duplicateGroups: DuplicateGroup[],
  theme: DefaultTheme
): FileCategory[] => {
  const categories: Record<string, { size: number; count: number }> = {};

  // Process APK files
  apkResults.forEach((file) => {
    const category = categorizeFile(file.path, "Apps");
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process WhatsApp files
  whatsappResults.forEach((file) => {
    const category = categorizeFile(file.path, file.type);
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Large files
  largeFileResults.forEach((file) => {
    const category = categorizeFile(file.path, file.category);
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Junk files
  junkFileResults.forEach((file) => {
    const category = categorizeFile(file.path, file.type);
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Old files
  oldFileResults.forEach((file) => {
    const category = categorizeFile(file.path);
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Cache/Logs
  cacheLogsResults.forEach((file) => {
    const category = categorizeFile(file.path, file.type);
    if (!categories[category]) {
      categories[category] = { size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Duplicate images
  duplicateGroups.forEach((group) => {
    group.files.forEach((file) => {
      const category = categorizeFile(file.path, "Images");
      if (!categories[category]) {
        categories[category] = { size: 0, count: 0 };
      }
      categories[category].size += file.size || 0;
      categories[category].count += 1;
    });
  });

  // Convert to array and sort by size
  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      icon: getCategoryIcon(name),
      size: data.size,
      count: data.count,
      color: getCategoryColor(name, theme),
    }))
    .sort((a, b) => b.size - a.size);
};

const StorageDashboardScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  // Redux state
  const storageInfo = useSelector((state: RootState) => state.appState.storageInfo) || { total: 0, used: 0, free: 0 };
  const apkResults = useSelector((state: RootState) => state.appState.apkResults);
  const whatsappResults = useSelector((state: RootState) => state.appState.whatsappResults);
  const largeFileResults = useSelector((state: RootState) => state.appState.largeFileResults);
  const junkFileResults = useSelector((state: RootState) => state.appState.junkFileResults);
  const oldFileResults = useSelector((state: RootState) => state.appState.oldFileResults);
  const cacheLogsResults = useSelector((state: RootState) => state.appState.cacheLogsResults);
  const duplicateResults = useSelector((state: RootState) => state.appState.duplicateResults);
  
  // Local UI state
  const [fileCategories, setFileCategories] = React.useState<FileCategory[]>([]);
  const [, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await initDatabase();
        
        // Use Redux state for scan results, fallback to database if empty
        let apkData = apkResults;
        let whatsappData = whatsappResults;
        let largeData = largeFileResults;
        let junkData = junkFileResults;
        let oldData = oldFileResults;
        let cacheData = cacheLogsResults;
        let duplicateData = duplicateResults;

        // If Redux state is empty, load from database
        if (apkData.length === 0 && whatsappData.length === 0 && largeData.length === 0) {
          const [
            apkResultsDb,
            whatsappResultsDb,
            largeFileResultsDb,
            junkFileResultsDb,
            oldFileResultsDb,
            cacheLogsResultsDb,
            duplicateGroupsDb,
          ] = await Promise.all([
            loadApkScanResults(),
            loadWhatsAppResults(),
            loadLargeFileResults(),
            loadJunkFileResults(),
            loadOldFileResults(),
            loadCacheLogsResults(),
            loadDuplicateGroups(),
          ]);
          apkData = apkResultsDb;
          whatsappData = whatsappResultsDb;
          largeData = largeFileResultsDb;
          junkData = junkFileResultsDb;
          oldData = oldFileResultsDb;
          cacheData = cacheLogsResultsDb;
          duplicateData = duplicateGroupsDb;
        }

        // Categorize files
        const categories = categorizeAllFiles(
          apkData,
          whatsappData,
          largeData,
          junkData,
          oldData,
          cacheData,
          duplicateData,
          theme
        );
        setFileCategories(categories);
      } catch (error) {
        console.error("Failed to load storage dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [theme, apkResults, whatsappResults, largeFileResults, junkFileResults, oldFileResults, cacheLogsResults, duplicateResults]);

  const totalSize = fileCategories.reduce((sum, cat) => sum + cat.size, 0);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppHeader title="Storage Dashboard" subtitle="visual dashboard" />
          
          {/* Circular Storage Indicator */}
          <View style={styles.indicatorSection}>
            <CircularStorageIndicator 
              total={storageInfo.total || 256} 
              used={storageInfo.used || 0} 
            />
          </View>

          {/* Storage Stats */}
          <View style={[styles.grid, styles.sectionSpacing]}>
            <View style={[styles.halfCard, styles.halfCardSpacing]}>
              <ResultStatCard label="Total" value={`${storageInfo.total.toFixed(1)} GB`} />
            </View>
            <View style={styles.halfCard}>
              <ResultStatCard label="Used" value={`${storageInfo.used.toFixed(1)} GB`} accent={theme.colors.primary} />
            </View>
          </View>
          <View style={[styles.grid, styles.sectionSpacing]}>
            <View style={[styles.halfCard, styles.halfCardSpacing]}>
              <ResultStatCard label="Free" value={`${storageInfo.free.toFixed(1)} GB`} />
            </View>
            <View style={styles.halfCard}>
              <ResultStatCard label="Scanned" value={formatBytes(totalSize)} accent={theme.colors.accent} />
            </View>
          </View>

          {/* File Categories List */}
          {fileCategories.length > 0 && (
            <View style={styles.sectionSpacing}>
              <Text style={styles.sectionTitle}>File Categories</Text>
              <NeumorphicContainer padding={0} style={styles.categoriesContainer}>
                {fileCategories.map((category, index) => {
                  const percentage = totalSize > 0 ? (category.size / totalSize) * 100 : 0;
                  return (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.categoryItem,
                        index < fileCategories.length - 1 && styles.categoryItemBorder,
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.categoryIconContainer}>
                        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}22` }]}>
                          <MaterialCommunityIcons
                            name={category.icon as any}
                            size={24}
                            color={category.color}
                          />
                        </View>
                      </View>
                      <View style={styles.categoryInfo}>
                        <View style={styles.categoryHeader}>
                          <Text style={styles.categoryName}>{category.name}</Text>
                          <Text style={styles.categorySize}>{formatBytes(category.size)}</Text>
                        </View>
                        <View style={styles.categoryMeta}>
                          <Text style={styles.categoryCount}>{category.count} files</Text>
                          <View style={styles.categoryProgressBar}>
                            <View
                              style={[
                                styles.categoryProgressFill,
                                { width: `${percentage}%`, backgroundColor: category.color },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </NeumorphicContainer>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default StorageDashboardScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    indicatorSection: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    halfCard: {
      flex: 1,
    },
    halfCardSpacing: {
      marginRight: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      marginBottom: theme.spacing.md,
    },
    categoriesContainer: {
      borderRadius: theme.radii.lg,
      overflow: "hidden",
    },
    categoryItem: {
      flexDirection: "row",
      padding: theme.spacing.md,
      alignItems: "center",
    },
    categoryItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.surfaceAlt}33`,
    },
    categoryIconContainer: {
      marginRight: theme.spacing.md,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryInfo: {
      flex: 1,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    categoryName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    categorySize: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    categoryMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    categoryCount: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    categoryProgressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.colors.surfaceAlt}33`,
      overflow: "hidden",
    },
    categoryProgressFill: {
      height: "100%",
      borderRadius: 2,
    },
  });
