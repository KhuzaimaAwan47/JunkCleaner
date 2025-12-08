import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, PressableProps, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import formatBytes from "../constants/formatBytes";

type Props = {
  title: string;
  subtitle?: string;
  rightIcon?: string;
  onRightPress?: PressableProps["onPress"];
  totalSize?: number;
  totalFiles?: number;
  unusedCount?: number;
  isAllSelected?: boolean;
  onSelectAllPress?: () => void;
  selectAllDisabled?: boolean;
};

const AppHeader: React.FC<Props> = ({
  title,
  subtitle: _subtitle,
  rightIcon = "chevron-left",
  onRightPress,
  totalSize,
  totalFiles,
  unusedCount,
  isAllSelected,
  onSelectAllPress,
  selectAllDisabled = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const onbackPress = () => {
      router.back();    
  };

  const pressHandler = onRightPress ?? (router.canGoBack() ? onbackPress : undefined);
  const isInteractive = Boolean(pressHandler);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Pressable
          style={[styles.iconButton, { opacity: isInteractive ? 1 : 0.4 }]}
          onPress={pressHandler}
          disabled={!isInteractive}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="navigate back"
          accessibilityState={{ disabled: !isInteractive }}
        >
          <MaterialCommunityIcons
            name={rightIcon as any}
            size={28}
            color={theme.mode === "dark" ? theme.colors.text : theme.colors.primary}
          />
        </Pressable>

        <View style={styles.titleContent}>
          <Text style={styles.heading}>{title}</Text>
          {totalSize !== undefined && totalFiles !== undefined && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                <Text style={styles.metaValue}>{formatBytes(totalSize)}</Text>
                <Text style={styles.metaLabel}> total</Text>
              </Text>
              <Text style={styles.metaDivider}> · </Text>
              <Text style={styles.metaText}>
                <Text style={styles.metaValue}>{totalFiles}</Text>
                <Text style={styles.metaLabel}> files</Text>
              </Text>
            </View>
          )}
          {totalFiles !== undefined && unusedCount !== undefined && totalSize === undefined && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                <Text style={styles.metaValue}>{totalFiles}</Text>
                <Text style={styles.metaLabel}> total</Text>
              </Text>
              <Text style={styles.metaDivider}> · </Text>
              <Text style={styles.metaText}>
                <Text style={styles.metaValue}>{unusedCount}</Text>
                <Text style={styles.metaLabel}> unused</Text>
              </Text>
            </View>
          )}
        </View>

        {onSelectAllPress !== undefined && (
          <TouchableOpacity
            style={[
              styles.selectAllButton,
              isAllSelected && styles.selectAllButtonActive,
            ]}
            onPress={onSelectAllPress}
            disabled={selectAllDisabled}
            activeOpacity={selectAllDisabled ? 1 : 0.85}
          >
            <MaterialCommunityIcons
              name={isAllSelected ? "check-all" : "selection"}
              size={18}
              color={isAllSelected ? theme.colors.primary : theme.colors.text}
            />
            <Text style={[styles.selectAllLabel, isAllSelected && styles.selectAllLabelActive]}>
              {isAllSelected ? "clear all" : "select all"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AppHeader;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      paddingBottom: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    titleContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    heading: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: 4,
    },
    metaText: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    metaValue: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    metaLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.normal,
    },
    metaDivider: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginHorizontal: 4,
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}88` : `${theme.colors.surfaceAlt}99`,
    },
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
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}22`,
    },
    selectAllLabel: {
      color: theme.colors.text,
      fontWeight: theme.fontWeight.semibold,
      fontSize: theme.fontSize.sm,
      textTransform: "capitalize",
    },
    selectAllLabelActive: {
      color: theme.colors.primary,
    },
  });
