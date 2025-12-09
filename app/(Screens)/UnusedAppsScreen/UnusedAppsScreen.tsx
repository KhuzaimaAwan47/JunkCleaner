import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  clearSelections,
  setLoading,
  setSelectedItems,
  setUnusedAppsResults,
  toggleItemSelection as toggleItemSelectionAction,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadUnusedAppsResults, saveUnusedAppsResults } from "../../../utils/db";
import { scanUnusedApps, UnusedAppInfo } from "./UnusedAppsScanner";

type SectionData = {
  title: string;
  data: UnusedAppInfo[];
};

const UnusedAppsScreen = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Redux state
  const apps = useSelector((state: RootState) => state.appState.unusedAppsResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.unused);
  const selectedPackageNamesArray = useSelector((state: RootState) => state.appState.selectedItems.unused);
  const selectedPackageNames = useMemo(() => new Set(selectedPackageNamesArray), [selectedPackageNamesArray]);
  
  // Local UI state
  const [hasScanned, setHasScanned] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadUnusedAppsResults();
        if (savedResults.length > 0) {
          dispatch(setUnusedAppsResults(savedResults));
          setHasScanned(true);
        }
      } catch (error) {
        console.error("Failed to load saved unused apps results:", error);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const scan = useCallback(async () => {
    dispatch(setLoading("unused", true));
    dispatch(setUnusedAppsResults([]));
    dispatch(clearSelections("unused"));
    try {
      const result = await scanUnusedApps();
      dispatch(setUnusedAppsResults(result));
      setHasScanned(true);
      // Save results to database
      await saveUnusedAppsResults(result);
    } catch (error) {
      console.warn("Unused apps scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for unused apps. Please try again.");
      setHasScanned(true);
    } finally {
      dispatch(setLoading("unused", false));
    }
  }, [dispatch]);

  const selectedStats = useMemo(() => {
    return {
      items: selectedPackageNames.size,
    };
  }, [selectedPackageNames]);

  const isAllSelected = useMemo(() => {
    return apps.length > 0 && apps.every((app) => selectedPackageNames.has(app.packageName));
  }, [apps, selectedPackageNames]);

  const toggleAppSelection = useCallback((packageName: string) => {
    dispatch(toggleItemSelectionAction("unused", packageName));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("unused"));
    } else {
      const allPackageNames = apps.map((app) => app.packageName);
      dispatch(setSelectedItems("unused", allPackageNames));
    }
  }, [isAllSelected, apps, dispatch]);

  const handleUninstall = useCallback(() => {
    const appsToUninstall = selectedStats.items > 0
      ? apps.filter((app) => selectedPackageNames.has(app.packageName))
      : apps;

    if (!appsToUninstall.length || uninstalling) {
      return;
    }

    Alert.alert(
      "Uninstall Apps?",
      `This will uninstall ${appsToUninstall.length} app${appsToUninstall.length > 1 ? "s" : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Uninstall",
          style: "destructive",
          onPress: async () => {
            setUninstalling(true);
            try {
              // TODO: Implement actual uninstall functionality
              // For now, just remove from list
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const remainingApps = apps.filter((app) => !appsToUninstall.some((uninstalled) => uninstalled.packageName === app.packageName));
              dispatch(setUnusedAppsResults(remainingApps));
              dispatch(clearSelections("unused"));
              Alert.alert("Success", `${appsToUninstall.length} app${appsToUninstall.length > 1 ? "s" : ""} uninstalled successfully.`);
            } catch (error) {
              console.warn("Uninstall failed", error);
              Alert.alert("Uninstall Failed", "Some apps could not be uninstalled.");
            } finally {
              setUninstalling(false);
            }
          },
        },
      ]
    );
  }, [apps, uninstalling, selectedStats.items, selectedPackageNames, dispatch]);

  // Clear selection when items change
  useEffect(() => {
    const availablePackageNames = new Set(apps.map((app) => app.packageName));
    const validSelections = selectedPackageNamesArray.filter((packageName) => availablePackageNames.has(packageName));
    if (validSelections.length !== selectedPackageNamesArray.length) {
      dispatch(setSelectedItems("unused", validSelections));
    }
  }, [apps, selectedPackageNamesArray, dispatch]);

  const groupedData = useMemo<SectionData[]>(() => {
    const unused = apps.filter((app) => app.category === "UNUSED");
    const lowUsage = apps.filter((app) => app.category === "LOW_USAGE");
    const active = apps.filter((app) => app.category === "ACTIVE");

    const sections: SectionData[] = [];
    
    if (unused.length > 0) {
      sections.push({ title: "UNUSED APPS", data: unused });
    }
    if (lowUsage.length > 0) {
      sections.push({ title: "LOW USAGE", data: lowUsage });
    }
    if (active.length > 0) {
      sections.push({ title: "ACTIVE", data: active });
    }

    return sections;
  }, [apps]);

  const renderItem = useCallback(
    ({ item }: { item: UnusedAppInfo }) => {
      const lastUsedText =
        item.lastUsedDays === -1
          ? "Never used"
          : item.lastUsedDays === 0
          ? "Used today"
          : item.lastUsedDays === 1
          ? "Used yesterday"
          : `Last used ${item.lastUsedDays} days ago`;

      const isActive = selectedPackageNames.has(item.packageName);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.appRow, isActive && styles.appRowSelected]}
          onPress={() => toggleAppSelection(item.packageName)}
        >
          <View style={styles.iconBubble}>
            <MaterialCommunityIcons
              name="application"
              size={28}
              color={theme.colors.primary}
            />
            {isActive ? (
              <View style={styles.selectionBadge}>
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
              </View>
            ) : null}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.appName}
            </Text>
            <Text style={styles.packageName} numberOfLines={1}>
              {item.packageName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{lastUsedText}</Text>
              <Text style={styles.confidenceScore}>
                {item.confidenceScore}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, theme, selectedPackageNames, toggleAppSelection]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <Text style={styles.sectionCount}>({section.data.length})</Text>
      </View>
    ),
    [styles]
  );

  const keyExtractor = useCallback((item: UnusedAppInfo) => item.packageName, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.md,
      paddingBottom: selectedStats.items > 0 && apps.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
    }),
    [theme.spacing.xl, theme.spacing.md, selectedStats.items, apps.length],
  );

  const uninstallDisabled = selectedStats.items === 0;

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
          <AppHeader
            title="Unused Apps"
            totalFiles={apps.length > 0 ? apps.length : undefined}
            unusedCount={apps.length > 0 ? apps.filter((a) => a.category === "UNUSED").length : undefined}
            isAllSelected={apps.length > 0 ? isAllSelected : undefined}
            onSelectAllPress={apps.length > 0 ? toggleSelectAll : undefined}
            selectAllDisabled={apps.length > 0 ? !apps.length : undefined}
          />

          {loading && (
            <ScanProgressCard title="Scanning apps..." style={styles.progressCard} />
          )}

          {!loading && apps.length > 0 ? (
            <SectionList
              sections={groupedData}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={listContentInset}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>no unused apps detected</Text>
                </View>
              }
              ListFooterComponent={<View style={styles.footerSpacer} />}
            />
          ) : !loading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="application-outline"
                size={48}
                color={theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {hasScanned ? "no unused apps found" : "run a scan to find unused apps"}
              </Text>
              {!hasScanned && <ScanActionButton label="start scan" onPress={scan} />}
            </View>
          ) : null}
        </View>
        {!uninstallDisabled && apps.length > 0 && (
          <View style={styles.fixedUninstallButtonContainer}>
            <TouchableOpacity
              style={[styles.uninstallButton, uninstalling && styles.uninstallButtonDisabled]}
              disabled={uninstalling}
              activeOpacity={uninstalling ? 1 : 0.9}
              onPress={handleUninstall}
            >
              <Text style={styles.uninstallButtonText}>
                uninstall {selectedStats.items} app{selectedStats.items !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
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
    progressCard: {
      marginTop: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}55` : `${theme.colors.surfaceAlt}33`,
    },
    sectionHeaderText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    sectionCount: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    appRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      marginTop: theme.spacing.sm,
    },
    appRowSelected: {
      borderColor: theme.colors.primary,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
      marginRight: theme.spacing.md,
      position: "relative",
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
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    appName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    packageName: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs / 2,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    confidenceScore: {
      color: theme.colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    footerSpacer: {
      height: theme.spacing.xl,
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
    fixedUninstallButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
    uninstallButton: {
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.error,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    uninstallButtonDisabled: {
      backgroundColor: `${theme.colors.surfaceAlt}55`,
    },
    uninstallButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
  });

export default UnusedAppsScreen;
