import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import { withOpacity } from '../theme/theme';
import formatBytes from '../constants/formatBytes';
import NeumorphicContainer from './NeumorphicContainer';

export interface DuplicateFileItem {
  id: string;
  path: string;
  size: number;
  modifiedDate: number;
  groupHash: string;
}

interface DuplicateCardProps {
  file: DuplicateFileItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview?: (file: DuplicateFileItem) => void;
}


function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

function formatDateLabel(timestamp?: number): string {
  if (!timestamp) return 'unknown date';
  // Handle both seconds and milliseconds timestamps
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  if (isNaN(date.getTime())) return 'unknown date';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}


function ensureFileUri(path: string): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('data:')) {
    return path;
  }
  return `file://${path}`;
}

export default function DuplicateCard({ file, isSelected, onToggleSelect, onPreview }: DuplicateCardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loadError, setLoadError] = React.useState(false);
  const imageUri = React.useMemo(() => ensureFileUri(file.path), [file.path]);
  const showImage = !!imageUri && !loadError;
  const handlePreview = React.useCallback(() => {
    if (!showImage || !onPreview) {
      return;
    }
    onPreview(file);
  }, [file, onPreview, showImage]);

  return (
    <View style={styles.cardWrapper}>
      <NeumorphicContainer padding={theme.spacing.md}>
        <View style={styles.cardInner}>
          {showImage ? (
            <Pressable
              disabled={!onPreview}
              onPress={handlePreview}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${getFileName(file.path)}`}
              style={[
                styles.thumbnailWrapper,
                { opacity: !onPreview ? 0.7 : 1 },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                contentFit="cover"
                onError={() => setLoadError(true)}
                style={styles.thumbnailImage}
                cachePolicy="memory-disk"
              />
            </Pressable>
          ) : (
            <View style={styles.iconBubble}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={28}
                color={theme.colors.primary}
              />
            </View>
          )}

          <View style={styles.infoColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {getFileName(file.path)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatBytes(file.size)}</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>{formatDateLabel(file.modifiedDate)}</Text>
            </View>
          </View>

          <Pressable
            style={styles.selectButton}
            onPress={onToggleSelect}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <View
              style={[
                styles.selectIndicator,
                isSelected
                  ? {
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.mode === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.15)',
                      shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.2,
                      shadowRadius: 6,
                      elevation: 4,
                    }
                  : {
                      borderColor: withOpacity(theme.colors.primary, 0.4),
                      backgroundColor: theme.colors.surface,
                      shadowColor: withOpacity(theme.colors.primary, 0.67),
                      shadowOpacity: 0.45,
                      shadowRadius: 10,
                      elevation: 8,
                    },
              ]}
            >
              {isSelected ? (
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
              ) : (
                <View
                  style={[
                    styles.selectIndicatorInner,
                    {
                      width: isSelected ? 12 : 6,
                      height: isSelected ? 12 : 6,
                      backgroundColor: isSelected ? theme.colors.white : withOpacity(theme.colors.surfaceAlt, 0.67),
                    },
                  ]}
                />
              )}
            </View>
          </Pressable>
        </View>
      </NeumorphicContainer>
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    cardWrapper: {
      marginVertical: 0,
    },
    cardInner: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    thumbnailWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withOpacity(theme.colors.surfaceAlt, 0.8),
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}18`,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    selectButton: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectIndicator: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectIndicatorInner: {
      borderRadius: 12,
    },
  });

