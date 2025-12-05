import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, useTheme } from 'styled-components/native';
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
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.fileRow, isActive && styles.fileRowSelected]}
          onPress={() => toggleSelect(item.path)}
        >
          <View style={styles.thumbWrapper}>
            {showThumbnail ? (
              <Image
                source={{ uri: item.path }}
                resizeMode="cover"
                style={styles.thumbnailImage}
                onError={() => recordThumbnailError(item.path)}
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={28}
                  color={theme.colors.textMuted}
                />
              </View>
            )}
            {isActive ? (
              <View style={styles.selectionBadge}>
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
              </View>
            ) : null}
          </View>
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>{filename}</Text>
            <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [thumbnailFallbacks, selected, theme.colors.textMuted, theme.colors.white, toggleSelect, recordThumbnailError, styles],
  );

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
        <FlatList
        data={filteredFiles}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
        contentContainerStyle={listContentInset}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <AppHeader
              title="Whatsapp Scanner"
              totalSize={summary.totalSize}
              totalFiles={summary.totalCount}
              isAllSelected={isAllFilteredSelected}
              onSelectAllPress={toggleSelectAllFiltered}
              selectAllDisabled={!filteredFiles.length}
            />
            {!hasSavedResults && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary, isScanning && styles.actionButtonDisabled]}
                  disabled={isScanning}
                  onPress={onRescan}
                  accessibilityRole="button"
                >
                  {isScanning ? (
                    <ActivityIndicator color={theme.colors.white} />
                  ) : (
                    <Text style={styles.actionLabel}>rescan</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              {FILTER_TYPES.map((type) => {
                const isActive = type === filterType;
                const countLabel =
                  type === 'All' ? summary.totalCount : summary.byType[type as WhatsAppFileType]?.count ?? 0;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setFilterType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {type.toLowerCase()} · {countLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {error ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ff8484" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {isScanning ? (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.emptyTitle}>scanning whatsapp folders</Text>
                <Text style={styles.emptySubtitle}>sit tight while we index your chats and media.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>
                  {files.length ? 'no files in this filter' : 'ready to clean whatsapp clutter'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {files.length
                    ? 'try switching to another media type.'
                    : 'tap rescan to fetch images, audio, and docs instantly.'}
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />
      </SafeAreaView>
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

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerSection: {
      width: '100%',
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      paddingVertical: theme.spacing.md - 2,
      borderRadius: theme.radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonPrimary: {
      backgroundColor: theme.colors.secondary,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionLabel: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    filtersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    filtersTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    filtersHint: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    filtersScrollContent: {
      paddingRight: theme.spacing.lg,
    },
    filterChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.xs,
    },
    filterChipActive: {
      borderColor: theme.colors.secondary,
      backgroundColor: `${theme.colors.secondary}22`,
    },
    filterChipText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: theme.colors.secondary,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      backgroundColor: 'rgba(255, 77, 79, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255, 77, 79, 0.4)',
    },
    errorText: {
      color: '#ff8a8a',
      flex: 1,
    },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      marginTop: theme.spacing.sm,
    },
    fileRowSelected: {
      borderColor: theme.colors.secondary,
    },
    thumbWrapper: {
      width: 60,
      height: 60,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      backgroundColor: `${theme.colors.surfaceAlt}55`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
      position: 'relative',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    thumbnailFallback: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileMeta: {
      flex: 1,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    fileSize: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    selectionBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0, 0, 0, 0.25)',
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    emptyCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontSize: 13,
    },
    footerSpacer: {
      height: theme.spacing.xl,
    },
  });

export default WhatsAppRemoverScreen;

