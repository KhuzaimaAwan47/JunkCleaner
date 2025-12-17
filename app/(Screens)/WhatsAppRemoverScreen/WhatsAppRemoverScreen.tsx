import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { DefaultTheme, useTheme } from 'styled-components/native';
import AppHeader from '../../../components/AppHeader';
import ErrorBanner from '../../../components/ErrorBanner';
import FilterContainer from '../../../components/FilterContainer';
import FixedDeleteButton from '../../../components/FixedDeleteButton';
import ScreenWrapper from '../../../components/ScreenWrapper';
import WhatsAppEmptyState from '../../../components/WhatsAppEmptyState';
import WhatsAppFileListItem from '../../../components/WhatsAppFileListItem';
import {
  clearSelections,
  setLoading,
  setSelectedItems,
  setWhatsappResults,
  toggleItemSelection,
} from '../../../redux-code/action';
import type { RootState } from '../../../redux-code/store';
import { initDatabase, loadWhatsAppResults, saveWhatsAppResults } from '../../../utils/db';
import {
  deleteSelected,
  scanWhatsApp,
  summarizeWhatsApp,
  WhatsAppFileType,
  WhatsAppScanResult,
} from './WhatsAppScanner';

type FilterType = 'All' | WhatsAppFileType;

const FILTER_TYPES: FilterType[] = [
  'All',
  'Images',
  'Video',
  'Documents',
  'Audio',
  'VoiceNotes',
  'Statuses',
  'Junk',
];

const WhatsAppRemoverScreen = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const files = useSelector((state: RootState) => state.appState.whatsappResults);
  const isScanning = useSelector((state: RootState) => state.appState.loadingStates.whatsapp);
  const selectedArray = useSelector((state: RootState) => state.appState.selectedItems.whatsapp);
  const selected = useMemo(() => new Set(selectedArray), [selectedArray]);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState<Record<string, boolean>>({});
  const [hasSavedResults, setHasSavedResults] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const savedResults = await loadWhatsAppResults();
        if (savedResults.length > 0) {
          dispatch(setWhatsappResults(savedResults));
          setHasSavedResults(true);
        }
      } catch (error) {
        console.error('Failed to load saved WhatsApp results:', error);
      }
    })();
  }, [dispatch]);

  const onRescan = useCallback(async () => {
    dispatch(setLoading("whatsapp", true));
    setError(null);
    setThumbnailFallbacks({});
    try {
      const results = await scanWhatsApp();
      dispatch(setWhatsappResults(results));
      dispatch(clearSelections("whatsapp"));
      await saveWhatsAppResults(results);
      setHasSavedResults(true);
    } catch (err) {
      setError((err as Error).message || 'scan failed');
    } finally {
      dispatch(setLoading("whatsapp", false));
    }
  }, [dispatch]);

  const toggleSelect = useCallback((path: string) => {
    dispatch(toggleItemSelection("whatsapp", path));
  }, [dispatch]);

  const filteredFiles = useMemo(
    () => (filterType === 'All' ? files : files.filter((file) => file.type === filterType)),
    [files, filterType],
  );

  const summary = useMemo(() => summarizeWhatsApp(files), [files]);
  const isAllFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selected.has(file.path));

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    filteredFiles.forEach((file) => {
      if (selected.has(file.path)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [filteredFiles, selected]);

  const deleteDisabled = selectedStats.items === 0;

  const toggleSelectAllFiltered = useCallback(() => {
    const currentSelected = new Set(selectedArray);
    filteredFiles.forEach((file) => {
      if (isAllFilteredSelected) {
        currentSelected.delete(file.path);
      } else {
        currentSelected.add(file.path);
      }
    });
    dispatch(setSelectedItems("whatsapp", Array.from(currentSelected)));
  }, [filteredFiles, isAllFilteredSelected, selectedArray, dispatch]);

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => (prev[path] ? prev : { ...prev, [path]: true }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (selectedStats.items === 0) return;
    const filesToDelete = filteredFiles.filter((file) => selected.has(file.path));
    try {
      await deleteSelected(filesToDelete);
      const remaining = files.filter((file) => !selected.has(file.path));
      dispatch(setWhatsappResults(remaining));
      dispatch(clearSelections("whatsapp"));
      await saveWhatsAppResults(remaining);
    } catch (err) {
      setError((err as Error).message || 'delete failed');
    }
  }, [selectedStats.items, filteredFiles, selected, files, dispatch]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { All: summary.totalCount };
    FILTER_TYPES.filter((t) => t !== 'All').forEach((type) => {
      counts[type] = summary.byType[type as WhatsAppFileType]?.count ?? 0;
    });
    return counts;
  }, [summary]);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: !deleteDisabled && filteredFiles.length > 0 ? theme.spacing.xl * 3 : theme.spacing.xl,
    }),
    [theme.spacing, deleteDisabled, filteredFiles.length],
  );

  const renderItem = useCallback<ListRenderItem<WhatsAppScanResult>>(
    ({ item }) => (
      <WhatsAppFileListItem
        item={item}
        selected={selected.has(item.path)}
        onPress={() => toggleSelect(item.path)}
        onThumbnailError={() => recordThumbnailError(item.path)}
        thumbnailFallback={thumbnailFallbacks[item.path] ?? false}
      />
    ),
    [selected, toggleSelect, recordThumbnailError, thumbnailFallbacks],
  );

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader
            title="Whatsapp Scanner"
            totalSize={summary.totalSize}
            totalFiles={summary.totalCount}
            isAllSelected={isAllFilteredSelected}
            onSelectAllPress={toggleSelectAllFiltered}
            selectAllDisabled={!filteredFiles.length}
          />
        </View>
        <FilterContainer
          categories={FILTER_TYPES}
          activeCategory={filterType}
          counts={filterCounts}
          onCategoryChange={(category) => setFilterType(category as FilterType)}
          loading={isScanning}
          hasSavedResults={hasSavedResults}
          scanLabel="rescan"
          onScan={onRescan}
          loadingTitle="scanning whatsapp folders"
          loadingSubtitle="indexing images, videos, docs, and voice notes"
        />
        {error && <View style={styles.errorContainer}><ErrorBanner error={error} /></View>}
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.path}
          renderItem={renderItem}
          contentContainerStyle={listContentInset}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isScanning}
              onRefresh={onRescan}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <WhatsAppEmptyState
              loading={isScanning}
              hasFiles={files.length > 0}
              hasSavedResults={hasSavedResults}
            />
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />
        <FixedDeleteButton
          items={selectedStats.items}
          size={selectedStats.size}
          disabled={deleteDisabled}
          onPress={handleDelete}
          visible={!deleteDisabled && filteredFiles.length > 0}
        />
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
    errorContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    footerSpacer: {
      height: theme.spacing.xl,
    },
  });

export default WhatsAppRemoverScreen;
