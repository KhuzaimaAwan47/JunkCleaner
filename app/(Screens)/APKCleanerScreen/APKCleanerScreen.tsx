import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import EmptyState from "../../../components/EmptyState";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  clearSelections,
  setAPKResults,
  setLoading,
  setSelectedItems,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadAPKResults, saveAPKResults } from "../../../utils/db";
import { scanAPKFiles, deleteAPKFiles } from "./APKCleanerScanner";
import APKFileListItem from "../../../components/APKFileListItem";

const APKCleanerScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const files = useSelector((state: RootState) => state.appState.apkResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.apk);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.apk);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDatabaseResults, setHasDatabaseResults] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; detail?: string }>({
    percent: 0,
  });

  const sortedFiles = useMemo(() => [...files].sort((a, b) => b.size - a.size), [files]);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const resultsAvailable = sortedFiles.length > 0;

  const selectedStats = useMemo(() => {
    let items = 0, size = 0;
    sortedFiles.forEach((f) => {
      if (selectedFilePaths.has(f.path)) {
        items += 1;
        size += f.size;
      }
    });
    return { items, size };
  }, [selectedFilePaths, sortedFiles]);

  const isAllSelected = useMemo(() => 
    sortedFiles.length > 0 && sortedFiles.every((f) => selectedFilePaths.has(f.path)),
    [sortedFiles, selectedFilePaths]
  );

  const toggleFileSelection = useCallback((path: string) => {
    dispatch(toggleItemSelection("apk", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("apk"));
    } else {
      const allPaths = sortedFiles.map((f) => f.path);
      dispatch(setSelectedItems("apk", allPaths));
    }
  }, [isAllSelected, sortedFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || deleting) {
      return;
    }
    console.log("Deleting APK files:", Array.from(selectedFilePaths));
    setDeleting(true);
    try {
      const filesToDelete = sortedFiles.filter((f) => selectedFilePaths.has(f.path));
      await deleteAPKFiles(filesToDelete);
      const remainingFiles = files.filter((f) => !selectedFilePaths.has(f.path));
      dispatch(setAPKResults(remainingFiles));
      dispatch(clearSelections("apk"));
      await saveAPKResults(remainingFiles);
    } catch (err) {
      console.error("Failed to delete APK files:", err);
      setError(err instanceof Error ? err.message : "Failed to delete files");
    } finally {
      setDeleting(false);
    }
  }, [selectedFilePaths, selectedStats.items, deleting, files, sortedFiles, dispatch]);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const savedResults = await loadAPKResults();
        setHasDatabaseResults(savedResults.length > 0);
        if (savedResults.length > 0) {
          dispatch(setAPKResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved APK results:", error);
        setHasDatabaseResults(false);
      }
    })();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    dispatch(setLoading("apk", true));
    setError(null);
    setScanProgress({ percent: 0, detail: "scanning for APK files..." });
    try {
      const results = await scanAPKFiles();
      dispatch(setAPKResults(results));
      dispatch(clearSelections("apk"));
      await saveAPKResults(results);
      setHasDatabaseResults(results.length > 0);
      setScanProgress({ percent: 100, detail: `found ${results.length} APK files` });
      if (results.length === 0) {
        setError("no APK files detected. grant storage permission in settings for more coverage.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to scan files. please try again.");
    } finally {
      dispatch(setLoading("apk", false));
    }
  }, [loading, dispatch]);

  useEffect(() => {
    const availablePaths = new Set(sortedFiles.map((f) => f.path));
    const validSelections = selectedFilePathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("apk", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="APK Cleaner" 
            subtitle="Find and remove APK installers"
            totalSize={resultsAvailable ? totalBytes : undefined}
            totalFiles={resultsAvailable ? sortedFiles.length : undefined}
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !sortedFiles.length : undefined}
          />
        </View>
        <ScrollView 
          contentContainerStyle={[
            styles.content,
            selectedStats.items > 0 && resultsAvailable ? { paddingBottom: theme.spacing.xl * 3 } : {}
          ]} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleScan}
              tintColor={theme.colors.primary}
            />
          }
        >
          {!loading && !resultsAvailable && (
            <View style={styles.sectionSpacing}>
              <ScanActionButton label="start APK scan" onPress={handleScan} fullWidth />
            </View>
          )}

          {loading && (
            <ScanProgressCard
              progress={scanProgress.percent}
              title="scanning for APK files"
              subtitle={scanProgress.detail || "searching device storage..."}
              style={styles.sectionSpacing}
            />
          )}

          {!loading && resultsAvailable && (
            <>
              <View style={[styles.resultsContainer, styles.sectionSpacing]}>
                {sortedFiles.map((f) => (
                  <APKFileListItem
                    key={f.path}
                    item={f}
                    selected={selectedFilePaths.has(f.path)}
                    onPress={() => toggleFileSelection(f.path)}
                  />
                ))}
              </View>
            </>
          )}

          {!loading && !resultsAvailable && error && (
            <View style={styles.sectionSpacing}>
              <EmptyState
                icon="alert-circle-outline"
                title={error}
              />
            </View>
          )}

          {!loading && !resultsAvailable && !error && (
            <View style={styles.sectionSpacing}>
              <EmptyState
                icon="android"
                title="no APK files detected"
                description="Pull down to refresh and scan for APK files"
              />
            </View>
          )}
        </ScrollView>
        {selectedStats.items > 0 && resultsAvailable && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.items}
              size={selectedStats.size}
              disabled={deleting}
              onPress={handleDelete}
            />
          </View>
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default APKCleanerScreen;

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

