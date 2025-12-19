import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import CategoryFileListItem from "../../../components/CategoryFileListItem";
import DeleteButton from "../../../components/DeleteButton";
import EmptyState from "../../../components/EmptyState";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  clearSelections,
  setSelectedItems,
  setImagesResults,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import type { CategoryFile } from "../../../utils/fileCategoryCalculator";
import { saveImagesResults } from "../../../utils/db";
import { useImagesScanner } from "./useImagesScanner";

const ImagesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const { isScanning, isRestoring, error, startScan } = useImagesScanner();
  
  const imagesResults = useSelector((state: RootState) => state.appState.imagesResults);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.images);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [clearing, setClearing] = useState(false);

  // Use images results directly from Redux and sort once
  const sortedFiles = useMemo(() => {
    return [...imagesResults].sort((a, b) => b.size - a.size);
  }, [imagesResults]);
  const totalBytes = useMemo(() => sortedFiles.reduce((sum, file) => sum + file.size, 0), [sortedFiles]);
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
    dispatch(toggleItemSelection("images", path));
  }, [dispatch]);

  const renderItem = useCallback(({ item }: { item: CategoryFile }) => (
    <CategoryFileListItem
      item={item}
      selected={selectedFilePaths.has(item.path)}
      onPress={() => toggleFileSelection(item.path)}
    />
  ), [selectedFilePaths, toggleFileSelection]);

  const keyExtractor = useCallback((item: CategoryFile) => item.path, []);

  const ItemSeparator = useCallback(() => <View style={{ height: theme.spacing.xs }} />, [theme]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("images"));
    } else {
      const allPaths = sortedFiles.map((f) => f.path);
      dispatch(setSelectedItems("images", allPaths));
    }
  }, [isAllSelected, sortedFiles, dispatch]);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0 || clearing) {
      return;
    }
    console.log("Deleting files:", Array.from(selectedFilePaths));
    setClearing(true);
    try {
      // Update category results by removing deleted files
      const remainingImages = imagesResults.filter(
        (f) => !selectedFilePaths.has(f.path)
      );

      dispatch(setImagesResults(remainingImages));
      dispatch(clearSelections("images"));
      
      // Update database
      try {
        await saveImagesResults(remainingImages);
      } catch (error) {
        console.error("Failed to save images results to database:", error);
      }
    } finally {
      setClearing(false);
    }
  }, [selectedFilePaths, selectedStats.items, clearing, imagesResults, dispatch]);

  useEffect(() => {
    if (selectedFilePathsArray.length === 0) return;
    const availablePaths = new Set(sortedFiles.map((f) => f.path));
    const validSelections = selectedFilePathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("images", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

  const onRefresh = useCallback(async () => {
    await startScan();
  }, [startScan]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Images" 
            subtitle="Manage image files"
            totalSize={resultsAvailable ? totalBytes : undefined}
            totalFiles={resultsAvailable ? sortedFiles.length : undefined}
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !sortedFiles.length : undefined}
          />
        </View>
        {error && (
          <View style={[styles.errorCard, styles.sectionSpacing]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {resultsAvailable ? (
          <FlatList
            data={sortedFiles}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={ItemSeparator}
            contentContainerStyle={[
              styles.content,
              selectedStats.items > 0 ? { paddingBottom: theme.spacing.xl * 3 } : {}
            ]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={10}
            refreshControl={
              <RefreshControl
                refreshing={isScanning}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        ) : !isScanning && !isRestoring ? (
          <View style={styles.sectionSpacing}>
            <EmptyState
              icon="image-outline"
              title="No images found"
              description="Pull down to refresh and scan for image files"
            />
          </View>
        ) : null}
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

export default ImagesScreen;

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
    errorCard: {
      backgroundColor: `${theme.colors.error}11`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.error}55`,
      marginHorizontal: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
  });

