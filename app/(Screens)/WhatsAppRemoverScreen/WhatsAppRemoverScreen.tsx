import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styledNative, { useTheme } from 'styled-components/native';
import AppHeader from '../../../components/AppHeader';
import ScreenWrapper from '../../../components/ScreenWrapper';
import formatBytes from '../../../constants/formatBytes';
import { initDatabase, loadWhatsAppResults, saveWhatsAppResults } from '../../../utils/db';
import {
  scanWhatsApp,
  summarizeWhatsApp,
  WhatsAppFileType,
  WhatsAppScanResult,
} from './WhatsAppScanner';

const styled = styledNative;

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

const PREVIEWABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.mp4', '.mov'];

const getFileIcon = (path: string, type: WhatsAppFileType): string => {
  const lower = path.toLowerCase();
  
  // Audio files
  if (type === 'Audio' || type === 'VoiceNotes') {
    if (lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.aac')) {
      return 'music';
    }
    if (type === 'VoiceNotes') {
      return 'microphone';
    }
    return 'music-note';
  }
  
  // Documents
  if (type === 'Documents') {
    if (lower.endsWith('.pdf')) return 'file-pdf-box';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'file-word-box';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'file-excel-box';
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'file-powerpoint-box';
    if (lower.endsWith('.txt')) return 'file-document-outline';
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) return 'folder-zip';
    return 'file-document';
  }
  
  // Other types
  if (type === 'Statuses') return 'image-multiple';
  if (type === 'Stickers') return 'sticker-emoji';
  if (type === 'Backups') return 'backup-restore';
  if (type === 'Junk') return 'delete-outline';
  
  return 'file-outline';
};

const WhatsAppRemoverScreen = () => {
  const theme = useTheme();
  const [files, setFiles] = useState<WhatsAppScanResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState<Record<string, boolean>>({});
  const [hasSavedResults, setHasSavedResults] = useState(false);

  // Load saved results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadWhatsAppResults();
        if (savedResults.length > 0) {
          setFiles(savedResults);
          setHasSavedResults(true);
        } else {
          setHasSavedResults(false);
        }
      } catch (error) {
        console.error('Failed to load saved WhatsApp results:', error);
        setHasSavedResults(false);
      }
    };
    loadSavedResults();
  }, []);

  const onRescan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setThumbnailFallbacks({});
    try {
      const results = await scanWhatsApp();
      setFiles(results);
      setSelected(new Set());
      // Save results to database
      await saveWhatsAppResults(results);
      setHasSavedResults(true);
    } catch (err) {
      setError((err as Error).message || 'scan failed');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const filteredFiles = useMemo(
    () => (filterType === 'All' ? files : files.filter((file) => file.type === filterType)),
    [files, filterType],
  );

  const summary = useMemo(() => summarizeWhatsApp(files), [files]);
  const activeFilterCount =
    filterType === 'All' ? filteredFiles.length : summary.byType[filterType]?.count ?? 0;
  const isAllFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selected.has(file.path));


  const toggleSelectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredFiles.forEach((file) => next.delete(file.path));
      } else {
        filteredFiles.forEach((file) => next.add(file.path));
      }
      return next;
    });
  }, [filteredFiles, isAllFilteredSelected]);

  const recordThumbnailError = useCallback((path: string) => {
    setThumbnailFallbacks((prev) => {
      if (prev[path]) {
        return prev;
      }
      return { ...prev, [path]: true };
    });
  }, []);

  const listContentInset = useMemo(
    () => ({
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    }),
    [theme.spacing.lg, theme.spacing.xl],
  );

  const renderItem = useCallback<ListRenderItem<WhatsAppScanResult>>(
    ({ item }) => {
      const filename = getFilename(item.path);
      const previewable = isPreviewableMedia(item.path) && !thumbnailFallbacks[item.path];
      const isActive = selected.has(item.path);
      const iconName = getFileIcon(item.path, item.type);
      const showThumbnail = previewable && (item.type === 'Images' || item.type === 'Video' || item.type === 'Statuses');
      
      return (
        <FileRow activeOpacity={0.85} selected={isActive} onPress={() => toggleSelect(item.path)}>
          <ThumbWrapper>
            {showThumbnail ? (
              <ThumbnailImage
                source={{ uri: item.path }}
                resizeMode="cover"
                onError={() => recordThumbnailError(item.path)}
              />
            ) : (
              <ThumbnailFallback>
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={28}
                  color={theme.colors.textMuted}
                />
              </ThumbnailFallback>
            )}
            {isActive ? (
              <SelectionBadge>
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
              </SelectionBadge>
            ) : null}
          </ThumbWrapper>
          <FileMeta>
            <FileName numberOfLines={1}>{filename}</FileName>
            <FileSize>{formatBytes(item.size)}</FileSize>
          </FileMeta>
        </FileRow>
      );
    },
    [thumbnailFallbacks, selected, theme.colors.textMuted, theme.colors.white, toggleSelect, recordThumbnailError],
  );

  return (
    <ScreenWrapper>
      <Screen edges={['bottom', 'left', 'right']}>
        <FlatList
        data={filteredFiles}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
        contentContainerStyle={listContentInset}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <HeaderSection>
            <AppHeader
              title="Whatsapp Scanner"
              totalSize={summary.totalSize}
              totalFiles={summary.totalCount}
              isAllSelected={isAllFilteredSelected}
              onSelectAllPress={toggleSelectAllFiltered}
              selectAllDisabled={!filteredFiles.length}
            />
            {!hasSavedResults && (
              <ActionsRow>
                <ActionButton
                  tone="primary"
                  disabled={isScanning}
                  onPress={onRescan}
                  accessibilityRole="button"
                >
                  {isScanning ? (
                    <ActivityIndicator color={theme.colors.white} />
                  ) : (
                    <ActionLabel>rescan</ActionLabel>
                  )}
                </ActionButton>
              </ActionsRow>
            )}

            <FiltersHeader>
              <FiltersTitle>filter by type</FiltersTitle>
              <FiltersHint>{activeFilterCount} in view</FiltersHint>
            </FiltersHeader>
            <FiltersScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: theme.spacing.lg }}
            >
              {FILTER_TYPES.map((type) => {
                const isActive = type === filterType;
                const countLabel =
                  type === 'All' ? summary.totalCount : summary.byType[type as WhatsAppFileType]?.count ?? 0;
                return (
                  <FilterChip key={type} active={isActive} onPress={() => setFilterType(type)} activeOpacity={0.8}>
                    <FilterChipText active={isActive}>
                      {type.toLowerCase()} · {countLabel}
                    </FilterChipText>
                  </FilterChip>
                );
              })}
            </FiltersScrollView>

            {error ? (
              <ErrorBanner>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ff8484" />
                <ErrorText>{error}</ErrorText>
              </ErrorBanner>
            ) : null}
          </HeaderSection>
        }
        ListEmptyComponent={
          <EmptyCard>
            {isScanning ? (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <EmptyTitle>scanning whatsapp folders</EmptyTitle>
                <EmptySubtitle>sit tight while we index your chats and media.</EmptySubtitle>
              </>
            ) : (
              <>
                <EmptyTitle>
                  {files.length ? 'no files in this filter' : 'ready to clean whatsapp clutter'}
                </EmptyTitle>
                <EmptySubtitle>
                  {files.length
                    ? 'try switching to another media type.'
                    : 'tap rescan to fetch images, audio, and docs instantly.'}
                </EmptySubtitle>
              </>
            )}
          </EmptyCard>
        }
        ListFooterComponent={<FooterSpacer />}
      />
      </Screen>
    </ScreenWrapper>
  );
};

const getFilename = (path: string) => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const isPreviewableMedia = (path: string) => {
  const lower = path.toLowerCase();
  return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const Screen = styled(SafeAreaView)`
  flex: 1;
`;

const HeaderSection = styled.View`
  width: 100%;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const ActionsRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const ActionButton = styled.TouchableOpacity<{ tone: 'primary' | 'danger'; disabled?: boolean }>`
  flex: 1;
  padding-vertical: ${({ theme }) => theme.spacing.md - 2}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ tone, theme }) =>
    tone === 'primary' ? theme.colors.secondary : theme.colors.accent};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const ActionLabel = styled.Text`
  color: ${({ theme }) => theme.colors.white};
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
`;

const FiltersHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const FiltersTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 600;
  text-transform: capitalize;
`;

const FiltersHint = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const FiltersScrollView = styled.ScrollView`
  flex-direction: row;
`;

const FilterChip = styled.TouchableOpacity<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs}px ${theme.spacing.sm}px`};
  border-radius: 999px;
  border-width: 1px;
  border-color: ${({ active, theme }) =>
    active ? theme.colors.secondary : `${theme.colors.surfaceAlt}55`};
  background-color: ${({ active, theme }) =>
    active ? `${theme.colors.secondary}22` : theme.colors.surface};
  margin-right: ${({ theme }) => theme.spacing.xs}px;
`;

const FilterChipText = styled.Text<{ active: boolean }>`
  color: ${({ active, theme }) => (active ? theme.colors.secondary : theme.colors.text)};
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
`;

const ErrorBanner = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: rgba(255, 77, 79, 0.1);
  border-width: 1px;
  border-color: rgba(255, 77, 79, 0.4);
`;

const ErrorText = styled.Text`
  color: #ff8a8a;
  flex: 1;
`;

const FileRow = styled.TouchableOpacity<{ selected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ selected, theme }) =>
    selected ? theme.colors.secondary : `${theme.colors.surfaceAlt}55`};
  margin-top: ${({ theme }) => theme.spacing.sm}px;
`;

const ThumbWrapper = styled.View`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.radii.lg}px;
  overflow: hidden;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md}px;
  position: relative;
`;

const ThumbnailImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ThumbnailFallback = styled.View`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const FileMeta = styled.View`
  flex: 1;
`;

const FileName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const FileSize = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 4px;
`;

const SelectionBadge = styled.View`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background-color: ${({ theme }) => theme.colors.secondary};
  align-items: center;
  justify-content: center;
  shadow-color: rgba(0, 0, 0, 0.25);
  shadow-opacity: 0.3;
  shadow-radius: 4px;
  elevation: 4;
`;

const EmptyCard = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }) => theme.radii.xl}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const EmptyTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`;

const EmptySubtitle = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  font-size: 13px;
`;

const FooterSpacer = styled.View`
  height: ${({ theme }) => theme.spacing.xl}px;
`;

export default WhatsAppRemoverScreen;

