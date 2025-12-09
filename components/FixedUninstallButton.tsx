import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type FixedUninstallButtonProps = {
  items: number;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  visible: boolean;
};

const FixedUninstallButton: React.FC<FixedUninstallButtonProps> = ({
  items,
  disabled,
  loading,
  onPress,
  visible,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <View style={styles.fixedUninstallButtonContainer}>
      <TouchableOpacity
        style={[styles.uninstallButton, (disabled || loading) && styles.uninstallButtonDisabled]}
        disabled={disabled || loading}
        activeOpacity={disabled || loading ? 1 : 0.9}
        onPress={onPress}
      >
        <Text style={styles.uninstallButtonText}>
          uninstall {items} app{items !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    fixedUninstallButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
    uninstallButton: {
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.error,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    uninstallButtonDisabled: {
      backgroundColor: `${theme.colors.surfaceAlt}55`,
    },
    uninstallButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
  });

export default FixedUninstallButton;

