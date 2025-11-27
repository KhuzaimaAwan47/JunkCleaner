import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteSelected,
  scanWhatsApp,
  summarizeWhatsApp,
  WhatsAppFileType,
  WhatsAppScanResult,
} from './WhatsAppScanner';

const formatSize = (size: number) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
const FILTER_TYPES: ('All' | WhatsAppFileType)[] = [
  'All',
  'Images',
  'Video',
  'Documents',
  'Audio',
  'VoiceNotes',
  'Statuses',
  'Junk',
];

export default function WhatsAppRemoverScreen() {
  const [files, setFiles] = useState<WhatsAppScanResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'All' | WhatsAppFileType>('All');

  const onScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      const results = await scanWhatsApp();
      setFiles(results);
      setSelected(new Set());
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

  const checkedFiles = useMemo(() => files.filter((file) => selected.has(file.path)), [files, selected]);

  const selectedBytes = useMemo(
    () => checkedFiles.reduce((sum, file) => sum + file.size, 0),
    [checkedFiles],
  );

  const summary = useMemo(() => summarizeWhatsApp(files), [files]);
  const activeFilterCount =
    filterType === 'All' ? filteredFiles.length : summary.byType[filterType]?.count ?? 0;
  const isAllFilteredSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selected.has(file.path));

  const onDelete = useCallback(async () => {
    if (!checkedFiles.length) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSelected(checkedFiles);
      const remaining = files.filter((file) => !selected.has(file.path));
      setFiles(remaining);
      setSelected(new Set());
    } catch (err) {
      setError((err as Error).message || 'delete failed');
    } finally {
      setIsDeleting(false);
    }
  }, [checkedFiles, files, selected]);

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

  const renderItem = ({ item }: { item: WhatsAppScanResult }) => {
    const isActive = selected.has(item.path);
    return (
      <TouchableOpacity
        style={[styles.row, isActive && styles.rowActive]}
        onPress={() => toggleSelect(item.path)}
        activeOpacity={0.7}
      >
        <View style={styles.rowMeta}>
          <Text style={styles.rowType}>{item.type}</Text>
          <Text style={styles.rowSize}>{formatSize(item.size)}</Text>
        </View>
        <Text style={styles.rowPath} numberOfLines={2}>
          {item.path.replace('file://', '')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>whatsapp remover</Text>
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonDisabled]}
          onPress={onScan}
          disabled={isScanning}
        >
          {isScanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>scan whatsapp</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardSpacing]}>
          <Text style={styles.summaryLabel}>total weight</Text>
          <Text style={styles.summaryValue}>{formatSize(summary.totalSize)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardSpacing]}>
          <Text style={styles.summaryLabel}>items found</Text>
          <Text style={styles.summaryValue}>{summary.totalCount}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.summaryCard,
            styles.summaryCardLast,
            styles.selectAllCard,
            (!filteredFiles.length || isAllFilteredSelected) && styles.selectAllCardActive,
          ]}
          onPress={toggleSelectAllFiltered}
          disabled={!filteredFiles.length}
        >
          <Text style={styles.summaryLabel}>filter select</Text>
          <Text style={styles.summaryValue}>
            {isAllFilteredSelected ? 'selected' : `${activeFilterCount} files`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTER_TYPES.map((type) => {
          const isActive = filterType === type;
          const countLabel =
            type === 'All'
              ? summary.totalCount
              : summary.byType[type as WhatsAppFileType]?.count ?? 0;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={styles.filterPillText}>
                {type.toLowerCase()} · {countLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredFiles}
        keyExtractor={(item) => item.path}
        contentContainerStyle={filteredFiles.length ? undefined : styles.emptyWrap}
        ListEmptyComponent={
          isScanning
            ? null
            : (
              <Text style={styles.emptyText}>
                {files.length
                  ? 'no files match this filter.'
                  : 'tap scan to snapshot whatsapp media folders instantly.'}
              </Text>
            )
        }
        renderItem={renderItem}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.summaryLabel}>selected</Text>
          <Text style={styles.summaryValue}>
            {checkedFiles.length} files · {formatSize(selectedBytes)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            styles.deleteButton,
            (!checkedFiles.length || isDeleting) && styles.buttonDisabled,
          ]}
          onPress={onDelete}
          disabled={!checkedFiles.length || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>delete selected</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f4f4f4',
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#00a86b',
  },
  deleteButton: {
    backgroundColor: '#ff4d4f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#0b0b0b',
    borderWidth: 1,
    borderColor: '#1d1d1d',
  },
  summaryCardSpacing: {
    marginRight: 8,
  },
  summaryCardLast: {
    marginLeft: 8,
  },
  selectAllCard: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  selectAllCardActive: {
    borderColor: '#00a86b',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1d1d1d',
    marginRight: 8,
    marginBottom: 8,
  },
  filterPillActive: {
    borderColor: '#00a86b',
  },
  filterPillText: {
    color: '#f4f4f4',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  row: {
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1d1d1d',
  },
  rowActive: {
    borderColor: '#00a86b',
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowType: {
    color: '#f4f4f4',
    fontWeight: '600',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  rowSize: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  rowPath: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9aa0a6',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1d1d1d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#9aa0a6',
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#f4f4f4',
    fontSize: 16,
    fontWeight: '600',
  },
});
