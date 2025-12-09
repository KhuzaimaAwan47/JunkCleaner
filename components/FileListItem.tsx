import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import formatBytes from "../constants/formatBytes";

export type FileListItemProps = {
  id?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  size?: number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  thumbnailUri?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  rightAccessory?: React.ReactNode;
};

const FileListItem: React.FC<FileListItemProps> = ({
  title,
  subtitle,
  meta,
  size,
  icon = "file-outline",
  thumbnailUri,
  selected = false,
  disabled = false,
  onPress,
  rightAccessory,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [thumbError, setThumbError] = React.useState(false);

  const showThumb = thumbnailUri && !thumbError;
  const sizeLabel = size != null ? formatBytes(size) : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.item, selected && styles.itemSelected]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.leading}>
        {showThumb ? (
          <Image
            source={{ uri: thumbnailUri ?? undefined }}
            style={styles.thumbnail}
            onError={() => setThumbError(true)}
          />
        ) : (
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />
          </View>
        )}
        {selected ? (
          <View style={styles.selectionBadge}>
            <MaterialCommunityIcons name="check" size={14} color={theme.colors.white} />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {sizeLabel ? (
            <Text style={styles.meta}>
              {meta ? " · " : ""}
              {sizeLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAccessory ? <View style={styles.trailing}>{rightAccessory}</View> : null}
    </TouchableOpacity>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    itemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceAlt,
    },
    leading: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceAlt,
    },
    iconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 12,
      resizeMode: "cover",
      backgroundColor: theme.colors.surface,
    },
    selectionBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.surface,
    },
    content: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    trailing: {
      marginLeft: theme.spacing.sm,
      alignItems: "flex-end",
      justifyContent: "center",
    },
  });

export default FileListItem;

