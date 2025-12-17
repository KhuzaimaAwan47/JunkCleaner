import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import EmptyState from "../../../components/EmptyState";
import LargeFileListItem from "../../../components/LargeFileListItem";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  clearSelections,
  setLargeFileResults,
  setLoading,
  setSelectedItems,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadLargeFileResults, saveLargeFileResults } from "../../../utils/db";
import { ScanPhase, scanLargeFiles } from "./LargeFileScanner";

type ProgressPhase = ScanPhase | "idle";

const LargeFilesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const files = useSelector((state: RootState) => state.appState.largeFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.large);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.large);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDatabaseResults, setHasDatabaseResults] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; phase: ProgressPhase; detail?: string }>({
    percent: 0,
    phase: "idle",
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
    dispatch(toggleItemSelection("large", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("large"));
    } else {
      const allPaths = sortedFiles.map((f) => f.path);
      dispatch(setSelectedItems("large", allPaths));
    }
  }, [isAllSelected, sortedFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
      return;
    }
    console.log("Deleting files:", Array.from(selectedFilePaths));
    setClearing(true);
    try {
      const remainingFiles = files.filter((f) => !selectedFilePaths.has(f.path));
      dispatch(setLargeFileResults(remainingFiles));
      dispatch(clearSelections("large"));
    } finally {
      setClearing(false);
    }
  }, [selectedFilePaths, selectedStats.items, clearing, files, dispatch]);

  const progressLabels: Record<string, string> = {
    permissions: "checking storage permissions",
    media: "indexing media library",
    directories: "sweeping folders",
    extensions: "flagging heavy extensions",
    finalizing: "wrapping up results",
  };
  const progressLabel = progressLabels[scanProgress.phase] || "scanning high-impact folders…";
  const progressDetail = scanProgress.detail ?? "downloads · dcim · movies · whatsapp media";

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const savedResults = await loadLargeFileResults();
        setHasDatabaseResults(savedResults.length > 0);
        if (savedResults.length > 0) {
          dispatch(setLargeFileResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved large file results:", error);
        setHasDatabaseResults(false);
      }
    })();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    dispatch(setLoading("large", true));
    setError(null);
    setScanProgress({ percent: 0, phase: "permissions", detail: "requesting access" });
    try {
      const results = await scanLargeFiles(512 * 1024 * 1024, (snapshot) => {
        setScanProgress({
          percent: Math.round(snapshot.ratio * 100),
          phase: snapshot.phase,
          detail: snapshot.detail,
        });
      });
      dispatch(setLargeFileResults(results));
      dispatch(clearSelections("large"));
      await saveLargeFileResults(results);
      setHasDatabaseResults(results.length > 0);
      if (results.length === 0) {
        setError("no large files detected yet. grant storage permission in settings for more coverage.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to scan files. please try again.");
    } finally {
      dispatch(setLoading("large", false));
    }
  }, [loading, dispatch]);

  useEffect(() => {
    const availablePaths = new Set(sortedFiles.map((f) => f.path));
    const validSelections = selectedFilePathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("large", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Large Files" 
            subtitle="Find and manage storage hogs"
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
              <ScanActionButton label="start storage scan" onPress={handleScan} fullWidth />
            </View>
          )}

          {loading && (
            <ScanProgressCard
              progress={scanProgress.percent}
              title={progressLabel}
              subtitle={progressDetail}
              style={styles.sectionSpacing}
            />
          )}

          {!loading && resultsAvailable && (
            <>
              <View style={[styles.resultsContainer, styles.sectionSpacing]}>
                {sortedFiles.map((f) => (
                  <LargeFileListItem
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
                icon="file-search-outline"
                title="no large files detected"
                description="Pull down to refresh and scan for large files"
              />
            </View>
          )}
        </ScrollView>
        {selectedStats.items > 0 && resultsAvailable && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.items}
              size={selectedStats.size}
              disabled={clearing}
              onPress={handleDelete}
            />
          </View>
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default LargeFilesScreen;

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
