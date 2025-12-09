import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type UnusedAppSectionHeaderProps = {
  title: string;
  count: number;
};

const UnusedAppSectionHeader: React.FC<UnusedAppSectionHeaderProps> = ({
  title,
  count,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <Text style={styles.sectionCount}>({count})</Text>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}55` : `${theme.colors.surfaceAlt}33`,
    },
    sectionHeaderText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    sectionCount: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
  });

export default UnusedAppSectionHeader;

