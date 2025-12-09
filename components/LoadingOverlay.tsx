import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, label }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.card}>
        <ActivityIndicator color={theme.colors.primary} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.background}DD`,
      zIndex: 10,
    },
    card: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.text,
      fontWeight: "600",
    },
  });

export default LoadingOverlay;

