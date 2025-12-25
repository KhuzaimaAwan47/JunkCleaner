import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import formatBytes from "../constants/formatBytes";
import { withOpacity } from "../theme/theme";
import DebouncedTouchableOpacity from "./DebouncedTouchableOpacity";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  title: string;
  icon: string;
  itemsCount: number;
  sizeCanFree: number;
  itemsLabel?: string; // e.g., "items found", "filter matches", "expendable items found"
  iconAccent?: string; // Optional accent color for icon background
  onView?: () => void;
  onScan?: () => void;
  isScanning?: boolean;
  hasData?: boolean; // Explicitly indicate database has data for this module
  description?: string; // Description text shown under title
};

const ModuleCard: React.FC<Props> = ({
  title,
  icon,
  itemsCount,
  sizeCanFree,
  itemsLabel = "items found",
  iconAccent,
  onView,
  onScan,
  isScanning = false,
  hasData,
  description,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const formattedSize = formatBytes(sizeCanFree);
  const iconBgColor = iconAccent ? withOpacity(iconAccent, 0.133) : withOpacity(theme.colors.primary, 0.133);
  const iconColor = iconAccent || theme.colors.primary;
  const shouldShowEye = itemsCount > 0 || hasData === true;
  const hasDataToShow = itemsCount > 0 || hasData === true;

  return (
    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
      <NeumorphicContainer padding={theme.spacing.lg} style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {description && !hasDataToShow && (
              <Text style={styles.description}>
                {description}
              </Text>
            )}
          </View>
        </View>

        {hasDataToShow && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {itemsCount} {itemsLabel}
            </Text>
            <Text style={styles.statsText}>{formattedSize} can be freed</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          {shouldShowEye && (
            <DebouncedTouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={onView}
              disabled={!onView}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={20}
                color={theme.colors.textMuted}
              />
            </DebouncedTouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={onScan}
            disabled={!onScan || isScanning}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={theme.colors.white}
              />
            )}
            <Text style={styles.scanButtonText}>{isScanning ? "Scanning..." : "Scan"}</Text>
          </TouchableOpacity>
        </View>
      </NeumorphicContainer>
    </MotiView>
  );
};

export default ModuleCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.xs,
      lineHeight: theme.fontSize.sm * 1.4,
    },
    statsContainer: {
      marginBottom: theme.spacing.md,
    },
    statsText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      marginBottom: 4,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.md,
      minHeight: 36,
    },
    viewButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.surfaceAlt, 0.6),
    },
    scanButton: {
      backgroundColor: theme.colors.secondary,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      gap: 6,
      minHeight: 38,
      marginLeft: "auto",
    },
    scanButtonDisabled: {
      opacity: 0.7,
    },
    scanButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
  });

