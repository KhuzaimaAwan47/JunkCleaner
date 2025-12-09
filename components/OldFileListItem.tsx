import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import formatBytes from "../constants/formatBytes";
import { ensurePreviewUri, formatAgeDays, formatModifiedDate, getFileTypeIcon, getFileName, isImageFile, isPreviewableMedia, isVideoFile } from "../utils/fileUtils";

type OldFileListItemProps = {
  item: OldFileInfo;
  selected: boolean;
  onPress: () => void;
  onThumbnailError?: () => void;
};

const OldFileListItem: React.FC<OldFileListItemProps> = ({
  item,
  selected,
  onPress,
  onThumbnailError,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [thumbnailError, setThumbnailError] = useState(false);

  const filename = getFileName(item.path);
  const isVideo = isVideoFile(item.path);
  const isImage = isImageFile(item.path);
  const previewable = isPreviewableMedia(item.path) && !thumbnailError;
  const iconName = getFileTypeIcon(item.path);
  const showThumbnail = previewable && (isImage || isVideo);
  const imageUri = showThumbnail ? ensurePreviewUri(item.path) : undefined;

  const handleThumbnailError = () => {
    setThumbnailError(true);
    onThumbnailError?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.fileRow, selected && styles.fileRowSelected]}
      onPress={onPress}
    >
      <View style={styles.thumbWrapper}>
        {showThumbnail && imageUri ? (
          <Image
            source={{ uri: imageUri }}
            resizeMode="cover"
            style={styles.thumbnailImage}
            onError={handleThumbnailError}
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
        <Text style={styles.fileSubtitle} numberOfLines={1}>
          {formatAgeDays(item.ageDays)} • {formatModifiedDate(item.modifiedDate)}
        </Text>
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
    },
    fileSize: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    fileSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
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
  });

export default OldFileListItem;

