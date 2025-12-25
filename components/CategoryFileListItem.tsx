import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { CategoryFile } from "../utils/fileCategoryCalculator";
import formatBytes from "../constants/formatBytes";
import {
  ensurePreviewUri,
  formatTimestamp,
  getFileTypeIcon,
  isImageFile,
  isPreviewableMedia,
  isVideoFile,
} from "../utils/fileUtils";
import NeumorphicContainer from "./NeumorphicContainer";

type CategoryFileListItemProps = {
  item: CategoryFile;
  selected: boolean;
  onPress: () => void;
};

const CategoryFileListItem: React.FC<CategoryFileListItemProps> = React.memo(({
  item,
  selected,
  onPress,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [thumbnailError, setThumbnailError] = useState(false);

  const filename = item.path.split("/").pop() || item.path;
  const isVideo = isVideoFile(item.path);
  const isImage = isImageFile(item.path);
  const previewable = isPreviewableMedia(item.path) && !thumbnailError;
  const showThumbnail = previewable && (isImage || isVideo);
  const imageUri = showThumbnail ? ensurePreviewUri(item.path) : undefined;
  const fileIcon = getFileTypeIcon(item.path);

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  return (
    <TouchableOpacity
      style={styles.itemWrapper}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <NeumorphicContainer 
        padding={theme.spacing.md}
        style={selected ? styles.itemSelected : undefined}
      >
        <View style={styles.itemInner}>
          <View style={styles.thumbnailWrapper}>
            {showThumbnail && imageUri ? (
              <Image
                source={{ uri: imageUri }}
                contentFit="cover"
                style={styles.thumbnailImage}
                onError={handleThumbnailError}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <MaterialCommunityIcons
                  name={fileIcon as any}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
            )}
            {selected && (
              <View style={styles.selectionBadge}>
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={theme.colors.white}
                />
              </View>
            )}
            {isImage && !previewable && !selected && (
              <View style={styles.fileTypeBadge}>
                <MaterialCommunityIcons
                  name="image"
                  size={16}
                  color={theme.colors.white}
                />
              </View>
            )}
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.fileHeader}>
              <Text style={styles.fileName} numberOfLines={1}>
                {filename}
              </Text>
              <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
            </View>
            <View style={styles.badgeRow}>
              {item.category && (
                <Text style={styles.tag}>{item.category}</Text>
              )}
              {item.modified != null && (
                <Text style={styles.metaText}>{formatTimestamp(item.modified)}</Text>
              )}
            </View>
          </View>
        </View>
      </NeumorphicContainer>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if item, selected, or onPress changes
  return (
    prevProps.item.path === nextProps.item.path &&
    prevProps.item.size === nextProps.item.size &&
    prevProps.selected === nextProps.selected &&
    prevProps.onPress === nextProps.onPress
  );
});

CategoryFileListItem.displayName = 'CategoryFileListItem';

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    itemWrapper: {
      marginVertical: 0,
    },
    itemInner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    itemSelected: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    thumbnailWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor: `${theme.colors.primary}18`,
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
    fileTypeBadge: {
      position: "absolute",
      bottom: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    fileHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    fileName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    fileSize: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.surfaceAlt}66`,
      color: theme.colors.text,
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
  });

export default CategoryFileListItem;

