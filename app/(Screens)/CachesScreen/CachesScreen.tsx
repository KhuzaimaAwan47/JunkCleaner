import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import CachesFileListItem from "../../../components/CachesFileListItem";
import DeleteButton from "../../../components/DeleteButton";
import EmptyState from "../../../components/EmptyState";
import ScanActionButton from "../../../components/ScanActionButton";
import ScanProgressCard from "../../../components/ScanProgressCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  clearSelections,
  setCachesResults,
  setLoading,
  setSelectedItems,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadCachesResults, saveCachesResults } from "../../../utils/db";
import { scanCaches, deleteCacheItems } from "./CachesScanner";

const CachesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const items = useSelector((state: RootState) => state.appState.cachesResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.caches);
  const selectedItemPathsArray = useSelector((state: RootState) => state.appState.selectedItems.caches);
  const selectedItemPaths = useMemo(() => new Set(selectedItemPathsArray), [selectedItemPathsArray]);
  
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDatabaseResults, setHasDatabaseResults] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; detail?: string }>({
    percent: 0,
  });

  const sortedItems = useMemo(() => [...items].sort((a, b) => b.size - a.size), [items]);
  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);
  const resultsAvailable = sortedItems.length > 0;

  const selectedStats = useMemo(() => {
    let count = 0, size = 0;
    sortedItems.forEach((item) => {
      if (selectedItemPaths.has(item.path)) {
        count += 1;
        size += item.size;
      }
    });
    return { count, size };
  }, [selectedItemPaths, sortedItems]);

  const isAllSelected = useMemo(() => 
    sortedItems.length > 0 && sortedItems.every((item) => selectedItemPaths.has(item.path)),
    [sortedItems, selectedItemPaths]
  );

  const handleToggleItemSelection = useCallback((path: string) => {
    dispatch(toggleItemSelection("caches", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("caches"));
    } else {
      const allPaths = sortedItems.map((item) => item.path);
      dispatch(setSelectedItems("caches", allPaths));
    }
  }, [isAllSelected, sortedItems, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.count === 0 || deleting) {
      return;
    }
    console.log("Deleting cache items:", Array.from(selectedItemPaths));
    setDeleting(true);
    try {
      const itemsToDelete = sortedItems.filter((item) => selectedItemPaths.has(item.path));
      await deleteCacheItems(itemsToDelete);
      const remainingItems = items.filter((item) => !selectedItemPaths.has(item.path));
      dispatch(setCachesResults(remainingItems));
      dispatch(clearSelections("caches"));
      await saveCachesResults(remainingItems);
    } catch (err) {
      console.error("Failed to delete cache items:", err);
      setError(err instanceof Error ? err.message : "Failed to delete items");
    } finally {
      setDeleting(false);
    }
  }, [selectedItemPaths, selectedStats.count, deleting, items, sortedItems, dispatch]);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const savedResults = await loadCachesResults();
        setHasDatabaseResults(savedResults.length > 0);
        if (savedResults.length > 0) {
          dispatch(setCachesResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved cache results:", error);
        setHasDatabaseResults(false);
      }
    })();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    if (loading) {
      return;
    }
    dispatch(setLoading("caches", true));
    setError(null);
    setScanProgress({ percent: 0, detail: "scanning for cache files..." });
    try {
      console.log('[CachesScreen] Starting manual scan...');
      const results = await scanCaches();
      console.log(`[CachesScreen] Scan completed with ${results.length} results`);
      dispatch(setCachesResults(results));
      dispatch(clearSelections("caches"));
      await saveCachesResults(results);
      setHasDatabaseResults(results.length > 0);
      setScanProgress({ percent: 100, detail: `found ${results.length} cache items` });
      if (results.length === 0) {
        setError("no cache files detected. android 11+ (api 30+) restricts access to /android/data and /android/obb directories due to scoped storage, even with all permissions. this is a platform security restriction. the feature may work on android 10 and below.");
      }
    } catch (err) {
      console.error('[CachesScreen] Scan error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`unable to scan files: ${errorMessage}. check console for details.`);
    } finally {
      dispatch(setLoading("caches", false));
    }
  }, [loading, dispatch]);

  useEffect(() => {
    const availablePaths = new Set(sortedItems.map((item) => item.path));
    const validSelections = selectedItemPathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedItemPathsArray.length) {
      dispatch(setSelectedItems("caches", validSelections));
    }
  }, [sortedItems, selectedItemPathsArray, dispatch]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Caches" 
            subtitle="Remove app caches & orphaned data"
            totalSize={resultsAvailable ? totalBytes : undefined}
            totalFiles={resultsAvailable ? sortedItems.length : undefined}
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !sortedItems.length : undefined}
          />
        </View>
        <ScrollView 
          contentContainerStyle={[
            styles.content,
            selectedStats.count > 0 && resultsAvailable ? { paddingBottom: theme.spacing.xl * 3 } : {}
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
              <ScanActionButton label="start cache scan" onPress={handleScan} fullWidth />
            </View>
          )}

          {loading && (
            <ScanProgressCard
              progress={scanProgress.percent}
              title="scanning for cache files"
              subtitle={scanProgress.detail || "searching device storage..."}
              style={styles.sectionSpacing}
            />
          )}

          {!loading && resultsAvailable && (
            <>
              <View style={[styles.resultsContainer, styles.sectionSpacing]}>
                {sortedItems.map((item) => (
                  <CachesFileListItem
                    key={item.path}
                    item={item}
                    selected={selectedItemPaths.has(item.path)}
                    onPress={() => handleToggleItemSelection(item.path)}
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
                icon="cached"
                title="no cache files detected"
                description="Pull down to refresh and scan for cache files"
              />
            </View>
          )}
        </ScrollView>
        {selectedStats.count > 0 && resultsAvailable && (
          <View style={styles.fixedDeleteButtonContainer}>
            <DeleteButton
              items={selectedStats.count}
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

export default CachesScreen;

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

