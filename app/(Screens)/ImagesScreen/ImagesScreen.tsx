import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
  setDuplicateResults,
  setLargeFileResults,
  setOldFileResults,
  setSelectedItems,
  setWhatsappResults,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { filterFilesByCategory, type CategoryFile } from "../../../utils/fileCategoryCalculator";

const ImagesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const largeFileResults = useSelector((state: RootState) => state.appState.largeFileResults);
  const oldFileResults = useSelector((state: RootState) => state.appState.oldFileResults);
  const whatsappResults = useSelector((state: RootState) => state.appState.whatsappResults);
  const duplicateResults = useSelector((state: RootState) => state.appState.duplicateResults);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.images);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [clearing, setClearing] = useState(false);

  // Filter images from all scan results
  const files = useMemo<CategoryFile[]>(() => {
    return filterFilesByCategory("Images", {
      largeFileResults,
      oldFileResults,
      whatsappResults,
      duplicateResults,
    });
  }, [largeFileResults, oldFileResults, whatsappResults, duplicateResults]);

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
    dispatch(toggleItemSelection("images", path));
  }, [dispatch]);

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
      // Remove deleted files from each result set
      const remainingLargeFiles = largeFileResults.filter(
        (f) => !selectedFilePaths.has(f.path)
      );
      const remainingOldFiles = oldFileResults.filter(
        (f) => !selectedFilePaths.has(f.path)
      );
      const remainingWhatsappFiles = whatsappResults.filter(
        (f) => !selectedFilePaths.has(f.path)
      );
      
      // Remove from duplicate results
      const remainingDuplicateResults = duplicateResults.map((group) => ({
        ...group,
        files: group.files.filter((f) => !selectedFilePaths.has(f.path)),
      })).filter((group) => group.files.length > 0);

      dispatch(setLargeFileResults(remainingLargeFiles));
      dispatch(setOldFileResults(remainingOldFiles));
      dispatch(setWhatsappResults(remainingWhatsappFiles));
      dispatch(setDuplicateResults(remainingDuplicateResults));
      dispatch(clearSelections("images"));
    } finally {
      setClearing(false);
    }
  }, [selectedFilePaths, selectedStats.items, clearing, largeFileResults, oldFileResults, whatsappResults, duplicateResults, dispatch]);

  useEffect(() => {
    const availablePaths = new Set(sortedFiles.map((f) => f.path));
    const validSelections = selectedFilePathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("images", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

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
        <ScrollView 
          contentContainerStyle={[
            styles.content,
            selectedStats.items > 0 && resultsAvailable ? { paddingBottom: theme.spacing.xl * 3 } : {}
          ]} 
          showsVerticalScrollIndicator={false}
        >
          {resultsAvailable ? (
            <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              {sortedFiles.map((f) => (
                <CategoryFileListItem
                  key={f.path}
                  item={f}
                  selected={selectedFilePaths.has(f.path)}
                  onPress={() => toggleFileSelection(f.path)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.sectionSpacing}>
              <EmptyState
                icon="image-outline"
                title="No images found"
                description="Run a smart scan to find image files on your device"
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
  });

