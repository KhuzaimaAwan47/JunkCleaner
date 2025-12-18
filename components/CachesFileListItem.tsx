import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { CacheItem } from "../app/(Screens)/CachesScreen/CachesScanner";
import formatBytes from "../constants/formatBytes";
import { formatTimestamp } from "../utils/fileUtils";
import NeumorphicContainer from "./NeumorphicContainer";

type CachesFileListItemProps = {
  item: CacheItem;
  selected: boolean;
  onPress: () => void;
};

const CachesFileListItem: React.FC<CachesFileListItemProps> = ({
  item,
  selected,
  onPress,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const displayName = item.packageName || item.path.split("/").pop() || item.path;
  const typeLabel = item.type === 'corpse' ? 'CORPSE' : 'CACHE';
  const typeColor = item.type === 'corpse' ? '#EF4444' : '#F59E0B';

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
          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={item.type === 'corpse' ? 'delete-outline' : 'cached'}
                size={24}
                color={item.type === 'corpse' ? '#EF4444' : '#F59E0B'}
              />
            </View>
            {selected && (
              <View style={styles.selectionBadge}>
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={theme.colors.white}
                />
              </View>
            )}
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.fileHeader}>
              <Text style={styles.fileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: `${typeColor}22` }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {typeLabel}
                </Text>
              </View>
              {item.packageName && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.packageName}
                </Text>
              )}
              {item.modifiedDate && (
                <Text style={styles.metaText}>
                  {formatTimestamp(item.modifiedDate / 1000)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </NeumorphicContainer>
    </TouchableOpacity>
  );
};

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
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: `${theme.colors.surfaceAlt}cc`,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    iconContainer: {
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
    typeBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
    },
    typeBadgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
  });

export default CachesFileListItem;

