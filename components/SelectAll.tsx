import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type SelectAllProps = {
  isAllSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export default function SelectAll({ isAllSelected, disabled = false, onPress }: SelectAllProps) {
  const theme = useTheme();
  const styles = useMemo(() => createSelectAllStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[styles.selectAllButton, isAllSelected && styles.selectAllButtonActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.85}
    >
      <MaterialCommunityIcons
        name={isAllSelected ? "check-all" : "selection"}
        size={18}
        color={isAllSelected ? theme.colors.secondary : theme.colors.text}
      />
      <Text style={[styles.selectAllLabel, isAllSelected && styles.selectAllLabelActive]}>
        {isAllSelected ? "clear all" : "select all"}
      </Text>
    </TouchableOpacity>
  );
}

const createSelectAllStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    selectAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}99` : `${theme.colors.surfaceAlt}77`,
      backgroundColor: theme.colors.surface,
    },
    selectAllButtonActive: {
      borderColor: theme.colors.secondary,
      backgroundColor: `${theme.colors.secondary}22`,
    },
    selectAllLabel: {
      color: theme.colors.text,
      fontWeight: theme.fontWeight.semibold,
      fontSize: theme.fontSize.sm,
      textTransform: "capitalize",
    },
    selectAllLabelActive: {
      color: theme.colors.secondary,
    },
  });

