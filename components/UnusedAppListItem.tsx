import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { UnusedAppInfo } from "../app/(Screens)/UnusedAppsScreen/UnusedAppsScanner";

type UnusedAppListItemProps = {
  item: UnusedAppInfo;
  selected: boolean;
  onPress: () => void;
};

const UnusedAppListItem: React.FC<UnusedAppListItemProps> = ({
  item,
  selected,
  onPress,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const iconSource = React.useMemo(
    () => (item.icon ? { uri: `data:image/png;base64,${item.icon}` } : null),
    [item.icon]
  );

  const lastUsedText =
    item.lastUsedDays === -1
      ? "No recent usage"
      : item.lastUsedDays === 0
      ? "Used today"
      : item.lastUsedDays === 1
      ? "Used yesterday"
      : `Last used ${item.lastUsedDays} days ago`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.appRow, selected && styles.appRowSelected]}
      onPress={onPress}
    >
      <View style={styles.iconBubble}>
        {iconSource ? (
          <Image source={iconSource} style={styles.appIcon} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons
            name="application"
            size={28}
            color={theme.colors.primary}
          />
        )}
        {selected ? (
          <View style={styles.selectionBadge}>
            <MaterialCommunityIcons name="check" size={16} color={theme.colors.white} />
          </View>
        ) : null}
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.appName} numberOfLines={1}>
          {item.appName}
        </Text>
        <Text style={styles.packageName} numberOfLines={1}>
          {item.packageName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{lastUsedText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    appRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      marginTop: theme.spacing.sm,
    },
    appRowSelected: {
      borderColor: theme.colors.primary,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
      marginRight: theme.spacing.md,
      position: "relative",
    },
    appIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
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
    appName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    packageName: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginTop: theme.spacing.xs / 2,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
  });

export default UnusedAppListItem;

