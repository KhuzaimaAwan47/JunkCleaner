import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type Props = {
  title: string;
  subtitle?: string;
  progress?: number | null;
  accentColor?: string;
  style?: ViewStyle;
  footnote?: string;
};

const ScanProgressCard: React.FC<Props> = ({
  title,
  subtitle,
  progress = null,
  accentColor,
  style,
  footnote,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const progressPercent = progress != null ? Math.min(100, Math.max(0, Math.round(progress))) : null;
  const accent = accentColor ?? theme.colors.primary;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        {progressPercent != null ? (
          <Text style={[styles.percent, { color: accent }]}>{progressPercent}%</Text>
        ) : (
          <ActivityIndicator color={accent} size="small" />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
};

export default ScanProgressCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      gap: theme.spacing.xs,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    percent: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
    },
    title: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textMuted,
    },
    footnote: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
    },
  });

