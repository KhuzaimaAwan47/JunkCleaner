import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import formatBytes from '../constants/formatBytes';
import { DuplicateFileItem } from './DuplicateCard';
import { ensurePreviewUri, formatDate, getFileName, getFileSource } from '../utils/fileUtils';

interface DuplicateFileItemProps {
  file: DuplicateFileItem;
  isSelected: boolean;
  hasLoadError: boolean;
  onToggleSelect: () => void;
  onPreview: (file: DuplicateFileItem) => void;
  onImageError?: () => void;
}

export default function DuplicateFileItemComponent({
  file,
  isSelected,
  hasLoadError,
  onToggleSelect,
  onPreview,
  onImageError,
}: DuplicateFileItemProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const imageUri = ensurePreviewUri(file.path);
  const showImage = !!imageUri && !hasLoadError;

  return (
    <TouchableOpacity style={styles.fileItem} onPress={onToggleSelect} activeOpacity={0.85}>
      <View style={styles.fileItemContent}>
        {showImage ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            style={styles.fileThumbnail}
          >
            <Image
              source={{ uri: imageUri }}
              resizeMode="cover"
              onError={onImageError}
              style={styles.fileThumbnailImage}
            />
          </Pressable>
        ) : (
          <View style={styles.fileIcon}>
            <MaterialCommunityIcons name="image-outline" size={24} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {getFileName(file.path)}
          </Text>
          <Text style={styles.fileMeta}>
            {formatBytes(file.size)} | {formatDate(file.modifiedDate)}
          </Text>
          <Text style={styles.fileSource}>{getFileSource(file.path)}</Text>
        </View>
        <View style={[styles.fileCheckbox, isSelected && styles.fileCheckboxSelected]}>
          {isSelected && <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    fileItem: {
      marginBottom: theme.spacing.xs,
    },
    fileItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.sm,
    },
    fileThumbnail: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
    },
    fileThumbnailImage: {
      width: '100%',
      height: '100%',
    },
    fileIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}18`,
    },
    fileInfo: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    fileMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    fileSource: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    fileCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: `${theme.colors.primary}66`,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileCheckboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  });

