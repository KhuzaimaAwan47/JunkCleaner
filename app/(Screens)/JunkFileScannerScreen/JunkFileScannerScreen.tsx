import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import DeleteButton from "../../../components/DeleteButton";
import EmptyState from "../../../components/EmptyState";
import JunkFileListItem from "../../../components/JunkFileListItem";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import {
  clearSelections,
  setJunkFileResults,
  setSelectedItems,
  toggleItemSelection
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { initDatabase, loadJunkFileResults } from "../../../utils/db";
import { deleteJunkFiles } from "./JunkFileScanner";

const JunkFileScannerScreen = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Redux state
  const items = useSelector((state: RootState) => state.appState.junkFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.junk);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.junk);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  // Local UI state
  const [clearing, setClearing] = useState(false);

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadJunkFileResults();
        if (savedResults.length > 0) {
          dispatch(setJunkFileResults(savedResults));
        }
      } catch (error) {
        console.error("Failed to load saved junk file results:", error);
      }
    };
    loadSavedResults();
  }, [dispatch]);

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
    dispatch(toggleItemSelection("junk", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("junk"));
    } else {
      const allPaths = items.map((item) => item.path);
      dispatch(setSelectedItems("junk", allPaths));
    }
  }, [isAllSelected, items, dispatch]);

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
              setTimeout(() => {
                const remainingItems = items.filter((item) => !itemsToDelete.some((deleted) => deleted.path === item.path));
                dispatch(setJunkFileResults(remainingItems));
                dispatch(clearSelections("junk"));
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
  }, [items, clearing, selectedStats.items, selectedFilePaths, dispatch]);

  // Clear selection when items change
  useEffect(() => {
    const availablePaths = new Set(items.map((item) => item.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("junk", validSelections));
    }
  }, [items, selectedFilePathsArray, dispatch]);

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
            <FlatList
              data={items}
              keyExtractor={(item) => item.path}
              renderItem={({ item }) => (
                <JunkFileListItem
                  item={item}
                  selected={selectedFilePaths.has(item.path)}
                  onPress={() => toggleFileSelection(item.path)}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: theme.spacing.md,
                paddingBottom: !deleteDisabled ? theme.spacing.xl * 3 : theme.spacing.xl,
              }}
            />
          ) : (
            <EmptyState
              icon="file-search-outline"
              title={loading ? "scanning storage..." : "run a scan to find junk files"}
            />
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

