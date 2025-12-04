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
import { initDatabase, loadApkScanResults, saveApkScanResults } from "../../../utils/db";
import { ApkFile, deleteApkFile, scanForAPKs } from "./APKScanner";

const APKsRemoverScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [apkFiles, setApkFiles] = useState<ApkFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadApkScanResults();
        if (savedResults.length > 0) {
          setApkFiles(savedResults);
          setHasScanned(true);
        }
      } catch (error) {
        console.error("Failed to load saved APK results:", error);
      }
    };
    loadSavedResults();
  }, []);

  const scan = useCallback(async () => {
    setLoading(true);
    setApkFiles([]);
    try {
      const result = await scanForAPKs();
      setApkFiles(result);
      setHasScanned(true);
      // Save results to database
      await saveApkScanResults(result);
    } catch (error) {
      console.warn("APK scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for APK files. Please try again.");
      setHasScanned(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const totalSize = useMemo(() => apkFiles.reduce((sum, item) => sum + (item.size || 0), 0), [apkFiles]);

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    apkFiles.forEach((file) => {
      if (selectedFilePaths.has(file.path)) {
        stats.items += 1;
        stats.size += file.size || 0;
      }
    });
    return stats;
  }, [selectedFilePaths, apkFiles]);

  const isAllSelected = useMemo(() => {
    return apkFiles.length > 0 && apkFiles.every((file) => selectedFilePaths.has(file.path));
  }, [apkFiles, selectedFilePaths]);

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
        apkFiles.forEach((file) => next.delete(file.path));
      } else {
        // Select all
        apkFiles.forEach((file) => next.add(file.path));
      }
      return next;
    });
  }, [isAllSelected, apkFiles]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0) {
      return;
    }

    const filesToDelete = apkFiles.filter((file) => selectedFilePaths.has(file.path));
    const totalSizeToDelete = filesToDelete.reduce((sum, file) => sum + (file.size || 0), 0);

    Alert.alert(
      "Delete APKs?",
      `This will permanently delete ${selectedStats.items} APK file${selectedStats.items !== 1 ? 's' : ''} (${formatBytes(totalSizeToDelete)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const pathsToDelete = Array.from(selectedFilePaths);
            setDeleting((prev) => {
              const next = new Set(prev);
              pathsToDelete.forEach((path) => next.add(path));
              return next;
            });

            let successCount = 0;
            let failCount = 0;

            for (const path of pathsToDelete) {
              try {
                await deleteApkFile(path);
                successCount++;
              } catch (error) {
                console.warn("Delete failed for", path, error);
                failCount++;
              }
            }

            // Remove successfully deleted files from state
            setApkFiles((prev) => prev.filter((item) => !pathsToDelete.includes(item.path)));
            setSelectedFilePaths(new Set());

            if (failCount > 0) {
              Alert.alert(
                "Delete Complete",
                `Deleted ${successCount} file${successCount !== 1 ? 's' : ''}. ${failCount} file${failCount !== 1 ? 's' : ''} could not be deleted.`
              );
            }

            setDeleting((prev) => {
              const next = new Set(prev);
              pathsToDelete.forEach((path) => next.delete(path));
              return next;
            });
          },
        },
      ]
    );
  }, [selectedFilePaths, selectedStats.items, apkFiles]);

  // Clear selection when files change
  useEffect(() => {
    setSelectedFilePaths((prev) => {
      const availablePaths = new Set(apkFiles.map((file) => file.path));
      const next = new Set<string>();
      prev.forEach((path) => {
        if (availablePaths.has(path)) {
          next.add(path);
        }
      });
      return next;
    });
  }, [apkFiles]);

  const renderItem = useCallback(
    (item: ApkFile) => {
      const isDeleting = deleting.has(item.path);
      const isSelected = selectedFilePaths.has(item.path);
      
      return (
        <TouchableOpacity
          key={item.path}
          style={styles.itemWrapper}
          onPress={() => toggleFileSelection(item.path)}
          disabled={isDeleting}
          activeOpacity={0.85}
        >
          <NeumorphicContainer 
            padding={theme.spacing.md}
            style={isSelected ? styles.itemSelected : undefined}
          >
            <View style={styles.itemInner}>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={28}
                  color={theme.colors.primary}
                />
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
                    {item.name}
                  </Text>
                  <Text style={styles.fileSize}>{formatBytes(item.size || 0)}</Text>
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
    [styles, theme, deleting, selectedFilePaths, toggleFileSelection]
  );

  const resultsAvailable = apkFiles.length > 0;

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="APK Remover" 
            subtitle="Scan and remove APK installer files"
            totalSize={resultsAvailable ? totalSize : undefined}
            totalFiles={resultsAvailable ? apkFiles.length : undefined}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!loading && !resultsAvailable && (
          <View style={[styles.primaryButtonContainer, styles.sectionSpacing]}>
            <TouchableOpacity style={styles.primaryButton} onPress={scan} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>start scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={[styles.progressCard, styles.sectionSpacing]}>
            <View style={styles.progressHeader}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
            <Text style={styles.progressText}>Scanning for APK files...</Text>
            <Text style={styles.progressSubtext}>checking common installation directories</Text>
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
                  disabled={!apkFiles.length}
                  onPress={toggleSelectAll}
                />
              </View>
            )}

            <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              {apkFiles.map((file) => renderItem(file))}
            </View>

            {!hasScanned && (
              <View style={[styles.rescanContainer, styles.sectionSpacing]}>
                <TouchableOpacity style={styles.rescanButton} onPress={scan} activeOpacity={0.8}>
                  <Text style={styles.rescanButtonText}>rescan</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedStats.items > 0 && (
              <DeleteButton
                items={selectedStats.items}
                size={selectedStats.size}
                disabled={false}
                onPress={handleDelete}
              />
            )}
          </>
        )}

        {!loading && hasScanned && apkFiles.length === 0 && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={48}
              color={theme.colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>no APK files found</Text>
            <Text style={styles.emptySubtitle}>
              No APK installer files were found on your device.
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
      justifyContent: "space-between",
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
    resultsContainer: {
      gap: theme.spacing.xs,
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
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
      position: "relative",
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

export default APKsRemoverScreen;
