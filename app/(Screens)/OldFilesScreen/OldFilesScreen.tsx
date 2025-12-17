import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ListRenderItem, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import FilterContainer from "../../../components/FilterContainer";
import FixedDeleteButton from "../../../components/FixedDeleteButton";
import LoadingOverlay from "../../../components/LoadingOverlay";
import OldFileListItem from "../../../components/OldFileListItem";
import OldFilesEmptyState from "../../../components/OldFilesEmptyState";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { clearSelections, setSelectedItems, toggleItemSelection } from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { OldFileInfo } from "./OldFilesScanner";
import { useOldFilesActions } from "./useOldFilesActions";
import { useOldFilesSelection } from "./useOldFilesSelection";
import { FILTER_TYPES, type FileCategory, useOldFilesSummary } from "./useOldFilesSummary";

const OldFilesScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dispatch = useDispatch();
  
  const oldFiles = useSelector((state: RootState) => state.appState.oldFileResults);
  const loading = useSelector((state: RootState) => state.appState.loadingStates.old);
  const selectedFilePathsArray = useSelector((state: RootState) => state.appState.selectedItems.old);
  const selectedFilePaths = useMemo(() => new Set(selectedFilePathsArray), [selectedFilePathsArray]);
  
  const [filterType, setFilterType] = useState<FileCategory>('All');
  const { hasSavedResults, handleScan, handleDelete } = useOldFilesActions(oldFiles, selectedFilePaths);

  const { totalSize, filteredFiles, categoryCounts } = useOldFilesSummary(oldFiles, filterType);
  const { selectedStats, isAllSelected } = useOldFilesSelection(filteredFiles, selectedFilePaths);

  const deleteDisabled = selectedStats.items === 0;

  const toggleFileSelection = useCallback((path: string) => {
    dispatch(toggleItemSelection("old", path));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("old"));
    } else {
      const allPaths = filteredFiles.map((file) => file.path);
      dispatch(setSelectedItems("old", allPaths));
    }
  }, [isAllSelected, filteredFiles, dispatch]);

  const onDelete = useCallback(() => handleDelete(selectedStats), [handleDelete, selectedStats]);

  useEffect(() => {
    const availablePaths = new Set(oldFiles.map((file) => file.path));
    const validSelections = selectedFilePathsArray.filter((path) => availablePaths.has(path));
    if (validSelections.length !== selectedFilePathsArray.length) {
      dispatch(setSelectedItems("old", validSelections));
    }
  }, [oldFiles, selectedFilePathsArray, dispatch]);

  const renderFileItem = useCallback<ListRenderItem<OldFileInfo>>(
    ({ item: file }) => (
      <OldFileListItem
        item={file}
        selected={selectedFilePaths.has(file.path)}
        onPress={() => toggleFileSelection(file.path)}
        onThumbnailError={() => {}}
      />
    ),
    [selectedFilePaths, toggleFileSelection]
  );

  const keyExtractor = useCallback((item: OldFileInfo, index: number) => `${item.path}-${index}`, []);

  const listContentInset = useMemo(() => ({
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: !deleteDisabled && filteredFiles.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
  }), [theme.spacing, deleteDisabled, filteredFiles.length]);

  const hasFiles = oldFiles.length > 0;
  const hasFilteredFiles = filteredFiles.length > 0;

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader 
            title="Old Files" 
            totalSize={hasFiles ? totalSize : undefined}
            totalFiles={hasFiles ? oldFiles.length : undefined}
            isAllSelected={hasFilteredFiles ? isAllSelected : undefined}
            onSelectAllPress={hasFilteredFiles ? toggleSelectAll : undefined}
            selectAllDisabled={!hasFilteredFiles}
          />
        </View>
        <FilterContainer
          categories={FILTER_TYPES}
          activeCategory={filterType}
          counts={categoryCounts}
          onCategoryChange={(category) => setFilterType(category as FileCategory)}
          loading={loading}
          hasSavedResults={hasSavedResults}
          scanLabel="Scan Old Files"
          onScan={handleScan}
          loadingTitle="Scanning for old files..."
          loadingSubtitle="Looking for items you can safely delete."
        />
        <FlatList
          data={filteredFiles}
          keyExtractor={keyExtractor}
          renderItem={renderFileItem}
          contentContainerStyle={listContentInset}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleScan}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <OldFilesEmptyState
              loading={loading}
              hasFiles={hasFiles}
              hasSavedResults={hasSavedResults}
            />
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />
        <FixedDeleteButton
          items={selectedStats.items}
          size={selectedStats.size}
          disabled={deleteDisabled}
          onPress={onDelete}
          visible={!deleteDisabled && hasFilteredFiles}
        />
        <LoadingOverlay visible={loading} label="Scanning for old files..." />
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
    footerSpacer: {
      height: theme.spacing.xl,
    },
  });

export default OldFilesScreen;

