import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import formatBytes from '../constants/formatBytes';
import type { WhatsAppFileType, WhatsAppScanResult } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';

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
  
  // APK files
  if (lower.endsWith('.apk')) return 'android';
  
  // Other types
  if (type === 'Statuses') return 'image-multiple';
  if (type === 'Stickers') return 'sticker-emoji';
  if (type === 'Backups') return 'backup-restore';
  if (type === 'Junk') return 'delete-outline';
  
  return 'file-outline';
};

const getFilename = (path: string) => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const isPreviewableMedia = (path: string) => {
  const lower = path.toLowerCase();
  return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

type WhatsAppFileListItemProps = {
  item: WhatsAppScanResult;
  selected: boolean;
  onPress: () => void;
  onThumbnailError: () => void;
  thumbnailFallback: boolean;
};

const WhatsAppFileListItem: React.FC<WhatsAppFileListItemProps> = ({
  item,
  selected,
  onPress,
  onThumbnailError,
  thumbnailFallback,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const filename = getFilename(item.path);
  const previewable = isPreviewableMedia(item.path) && !thumbnailFallback;
  const iconName = getFileIcon(item.path, item.type);
  const showThumbnail = previewable && (item.type === 'Images' || item.type === 'Video' || item.type === 'Statuses');
  
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.fileRow, selected && styles.fileRowSelected]}
      onPress={onPress}
    >
      <View style={styles.thumbWrapper}>
        {showThumbnail ? (
          <Image
            source={{ uri: item.path }}
            contentFit="cover"
            style={styles.thumbnailImage}
            onError={onThumbnailError}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <MaterialCommunityIcons
              name={iconName as any}
              size={40}
              color={theme.colors.textMuted}
            />
          </View>
        )}
        {selected ? (
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
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
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
      borderColor: theme.colors.primary,
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
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0, 0, 0, 0.25)',
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
  });

export default WhatsAppFileListItem;

