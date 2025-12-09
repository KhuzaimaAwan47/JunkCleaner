import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type EmptyStateProps = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={32} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    actionButton: {
      marginTop: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
    },
    actionLabel: {
      color: theme.colors.white,
      fontWeight: "600",
      fontSize: 14,
    },
  });

export default EmptyState;

