import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import formatBytes from "../constants/formatBytes";

type SelectionBarProps = {
  selectedCount: number;
  selectedSize?: number;
  totalCount?: number;
  onSelectAll?: () => void;
  allSelected?: boolean;
  onClear?: () => void;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
};

const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  selectedSize = 0,
  totalCount = 0,
  onSelectAll,
  allSelected = false,
  onClear,
  actionLabel,
  onAction,
  actionDisabled = false,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const selectionText =
    selectedCount > 0
      ? `${selectedCount} selected · ${formatBytes(selectedSize)}`
      : totalCount > 0
      ? `${totalCount} found`
      : "No items";

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.label}>{selectionText}</Text>
        {onSelectAll ? (
          <TouchableOpacity onPress={onSelectAll} activeOpacity={0.85}>
            <Text style={styles.link}>{allSelected ? "Clear all" : "Select all"}</Text>
          </TouchableOpacity>
        ) : null}
        {onClear && selectedCount > 0 ? (
          <TouchableOpacity onPress={onClear} activeOpacity={0.85}>
            <Text style={styles.link}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.action, (actionDisabled || selectedCount === 0) && styles.actionDisabled]}
        disabled={actionDisabled || selectedCount === 0}
        onPress={onAction}
        activeOpacity={0.9}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
      flexWrap: "wrap",
    },
    label: {
      color: theme.colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    link: {
      color: theme.colors.primary,
      fontWeight: "700",
      fontSize: 13,
    },
    action: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
    },
    actionDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    actionLabel: {
      color: theme.colors.white,
      fontWeight: "700",
      fontSize: 14,
    },
  });

export default SelectionBar;

