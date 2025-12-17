import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
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
  setLargeFileResults,
  setOldFileResults,
  setSelectedItems,
  setWhatsappResults,
  setDocumentsResults,
  toggleItemSelection,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import type { CategoryFile } from "../../../utils/fileCategoryCalculator";
import { saveDocumentsResults } from "../../../utils/db";

const DocumentsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const documentsResults = useSelector((state: RootState) => state.appState.documentsResults);
  const largeFileResults = useSelector((state: RootState) => state.appState.largeFileResults);
  const oldFileResults = useSelector((state: RootState) => state.appState.oldFileResults);
  const whatsappResults = useSelector((state: RootState) => state.appState.whatsappResults);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.documents);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [clearing, setClearing] = useState(false);

  // Use documents results directly from Redux and sort once
  const sortedFiles = useMemo(() => {
    return [...documentsResults].sort((a, b) => b.size - a.size);
  }, [documentsResults]);
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
    dispatch(toggleItemSelection("documents", path));
  }, [dispatch]);

  const renderItem = useCallback(({ item }: { item: CategoryFile }) => (
    <CategoryFileListItem
      item={item}
      selected={selectedFilePaths.has(item.path)}
      onPress={() => toggleFileSelection(item.path)}
    />
  ), [selectedFilePaths, toggleFileSelection]);

  const keyExtractor = useCallback((item: CategoryFile) => item.path, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("documents"));
    } else {
      const allPaths = sortedFiles.map((f) => f.path);
      dispatch(setSelectedItems("documents", allPaths));
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

      // Update category results by removing deleted files
      const remainingDocuments = documentsResults.filter(
        (f) => !selectedFilePaths.has(f.path)
      );

      dispatch(setLargeFileResults(remainingLargeFiles));
      dispatch(setOldFileResults(remainingOldFiles));
      dispatch(setWhatsappResults(remainingWhatsappFiles));
      dispatch(setDocumentsResults(remainingDocuments));
      dispatch(clearSelections("documents"));
      
      // Update database
      try {
        await saveDocumentsResults(remainingDocuments);
      } catch (error) {
        console.error("Failed to save documents results to database:", error);
      }
    } finally {
      setClearing(false);
    }
  }, [selectedFilePaths, selectedStats.items, clearing, largeFileResults, oldFileResults, whatsappResults, documentsResults, dispatch]);

  useEffect(() => {
    if (selectedFilePathsArray.length === 0) return;
    const availablePaths = new Set(sortedFiles.map((f) => f.path));
    const validSelections = selectedFilePathsArray.filter((p) => availablePaths.has(p));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("documents", validSelections));
    }
  }, [sortedFiles, selectedFilePathsArray, dispatch]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Documents" 
            subtitle="Manage document files"
            totalSize={resultsAvailable ? totalBytes : undefined}
            totalFiles={resultsAvailable ? sortedFiles.length : undefined}
            isAllSelected={resultsAvailable ? isAllSelected : undefined}
            onSelectAllPress={resultsAvailable ? toggleSelectAll : undefined}
            selectAllDisabled={resultsAvailable ? !sortedFiles.length : undefined}
          />
        </View>
        {resultsAvailable ? (
          <FlatList
            data={sortedFiles}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
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
          />
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              icon="file-document-outline"
              title="No documents found"
              description="Run a smart scan to find document files on your device"
            />
          </View>
        )}
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

export default DocumentsScreen;

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

