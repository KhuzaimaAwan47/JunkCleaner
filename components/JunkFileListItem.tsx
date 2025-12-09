import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { JunkFileItem } from "../app/(Screens)/JunkFileScannerScreen/JunkFileScanner";
import formatBytes from "../constants/formatBytes";

const PREVIEWABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.mp4', '.mov'];

type JunkFileListItemProps = {
  item: JunkFileItem;
  selected: boolean;
  onPress: () => void;
};

const getFileIcon = (path: string, type: string): string => {
  const lower = path.toLowerCase();
  
  // Image files
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/)) {
    return 'image';
  }
  
  // Video files
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/)) {
    return 'video';
  }
  
  // Audio files
  if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) {
    return 'music';
  }
  
  // Documents
  if (lower.endsWith('.pdf')) return 'file-pdf-box';
  if (lower.match(/\.(doc|docx)$/)) return 'file-word-box';
  if (lower.match(/\.(xls|xlsx)$/)) return 'file-excel-box';
  if (lower.match(/\.(ppt|pptx)$/)) return 'file-powerpoint-box';
  if (lower.endsWith('.txt')) return 'file-document-outline';
  if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'folder-zip';
  
  // Junk file types
  if (type === 'cache') return 'cached';
  if (type === 'temp' || type === 'log') return 'file-outline';
  
  return 'file-outline';
};

const formatModifiedDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
};

const isPreviewableMedia = (path: string): boolean => {
  const lower = path.toLowerCase();
  return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const getFilename = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const JunkFileListItem: React.FC<JunkFileListItemProps> = ({
  item,
  selected,
  onPress,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [thumbnailError, setThumbnailError] = useState(false);

  const filename = getFilename(item.path);
  const previewable = isPreviewableMedia(item.path) && !thumbnailError;
  const iconName = getFileIcon(item.path, item.type);
  const showThumbnail = previewable && (item.path.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|mp4|mov)$/i));

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
            resizeMode="cover"
            style={styles.thumbnailImage}
            onError={() => setThumbnailError(true)}
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
        <View style={styles.fileMetaRow}>
          <Text style={styles.badge}>{item.type}</Text>
          <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
        </View>
        <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
        <Text style={styles.dateText}>{formatModifiedDate(item.modified)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
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
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
      position: "relative",
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
    },
    thumbnailFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    fileMeta: {
      flex: 1,
    },
    fileName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    fileMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: 4,
    },
    fileSize: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 2,
    },
    selectionBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0, 0, 0, 0.25)",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.primary}22`,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
  });

export default JunkFileListItem;

