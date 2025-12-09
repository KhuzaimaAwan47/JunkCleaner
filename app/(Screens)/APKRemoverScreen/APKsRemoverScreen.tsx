import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import EmptyState from "../../../components/EmptyState";
import FileListItem from "../../../components/FileListItem";
import LoadingOverlay from "../../../components/LoadingOverlay";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import SelectionBar from "../../../components/SelectionBar";
import formatBytes from "../../../constants/formatBytes";
import {
  clearSelections,
  setApkResults,
  setLoading,
  setSelectedItems,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadApkScanResults, saveApkScanResults } from "../../../utils/db";
import { ApkFile, deleteApkFile, scanForAPKs } from "./APKScanner";

const APKsRemoverScreen = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Redux state
  const apkFiles = useSelector((state: RootState) => state.appState.apkResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.apk);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.apk);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  // Local UI state
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadApkScanResults();
        if (savedResults.length > 0) {
          dispatch(setApkResults(savedResults));
          setHasScanned(true);
        }
      } catch (error) {
        console.error("Failed to load saved APK results:", error);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const scan = useCallback(async () => {
    dispatch(setLoading("apk", true));
    dispatch(setApkResults([]));
    dispatch(clearSelections("apk"));
    try {
      const result = await scanForAPKs();
      dispatch(setApkResults(result));
      setHasScanned(true);
      // Save results to database
      await saveApkScanResults(result);
    } catch (error) {
      console.warn("APK scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for APK files. Please try again.");
      setHasScanned(true);
    } finally {
      dispatch(setLoading("apk", false));
    }
  }, [dispatch]);

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
    dispatch(toggleItemSelection("apk", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("apk"));
    } else {
      const allPaths = apkFiles.map((file) => file.path);
      dispatch(setSelectedItems("apk", allPaths));
    }
  }, [isAllSelected, apkFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
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
            setClearing(true);
            const pathsToDelete = Array.from(selectedFilePaths);
            setDeleting((prev) => {
              const next = new Set(prev);
              pathsToDelete.forEach((path) => next.add(path));
              return next;
            });

            let successCount = 0;
            let failCount = 0;

            try {
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
              const remainingFiles = apkFiles.filter((item) => !pathsToDelete.includes(item.path));
              dispatch(setApkResults(remainingFiles));
              dispatch(clearSelections("apk"));

              if (failCount > 0) {
                Alert.alert(
                  "Delete Complete",
                  `Deleted ${successCount} file${successCount !== 1 ? 's' : ''}. ${failCount} file${failCount !== 1 ? 's' : ''} could not be deleted.`
                );
              }
            } finally {
              setDeleting((prev) => {
                const next = new Set(prev);
                pathsToDelete.forEach((path) => next.delete(path));
                return next;
              });
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [selectedStats.items, clearing, apkFiles, selectedFilePaths, dispatch]);

  // Clear selection when files change
  useEffect(() => {
    const availablePaths = new Set(apkFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("apk", validSelections));
    }
  }, [apkFiles, selectedFilePathsArray, dispatch]);

  const renderItem = useCallback(
    (item: ApkFile) => {
      const isDeleting = deleting.has(item.path);
      const isSelected = selectedFilePaths.has(item.path);
      return (
        <FileListItem
          key={item.path}
          title={item.name}
          subtitle={item.path}
          size={item.size}
          icon="package-variant"
          selected={isSelected}
          disabled={isDeleting}
          onPress={() => toggleFileSelection(item.path)}
          rightAccessory={
            isDeleting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null
          }
        />
      );
    },
    [deleting, selectedFilePaths, toggleFileSelection, theme.colors.primary]
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
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !apkFiles.length : undefined}
          />
        </View>
        <ScrollView 
          contentContainerStyle={[
            styles.content,
            resultsAvailable ? { paddingBottom: theme.spacing.xl * 3 } : {}
          ]} 
          showsVerticalScrollIndicator={false}
        >
          {!loading && !resultsAvailable && (
            <View style={[styles.sectionSpacing]}>
              <ScanActionButton label="start scan" onPress={scan} fullWidth />
            </View>
          )}

          {loading && (
            <ScanProgressCard
              title="Scanning for APK files..."
              subtitle="checking common installation directories"
              style={styles.sectionSpacing}
            />
          )}

          {!loading && resultsAvailable && (
            <>
              <View style={[styles.resultsContainer, styles.sectionSpacing]}>
                {apkFiles.map((file) => renderItem(file))}
              </View>

              {!hasScanned && (
                <View style={[styles.sectionSpacing]}>
                  <ScanActionButton variant="outline" label="rescan" onPress={scan} />
                </View>
              )}
            </>
          )}

          {!loading && hasScanned && apkFiles.length === 0 && (
            <EmptyState
              icon="package-variant-closed"
              title="No APK files found"
              description="We could not find APK installer files on your device."
              actionLabel="Rescan"
              onAction={scan}
            />
          )}
        </ScrollView>
        {resultsAvailable && (
          <View style={styles.fixedDeleteButtonContainer}>
            <SelectionBar
              selectedCount={selectedStats.items}
              selectedSize={selectedStats.size}
              totalCount={apkFiles.length}
              onSelectAll={toggleSelectAll}
              allSelected={isAllSelected}
              onClear={() => dispatch(clearSelections("apk"))}
              actionLabel="Delete"
              onAction={handleDelete}
              actionDisabled={clearing}
            />
          </View>
        )}
        <LoadingOverlay visible={loading} label="Scanning APK files..." />
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
    resultsContainer: {
      gap: theme.spacing.xs,
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

export default APKsRemoverScreen;
