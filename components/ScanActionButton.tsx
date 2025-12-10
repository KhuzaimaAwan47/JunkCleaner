import React from "react";
import { StyleSheet, Text, ViewStyle, TextStyle, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import DebouncedTouchableOpacity from "./DebouncedTouchableOpacity";

type Variant = "primary" | "outline";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
};

const ScanActionButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  fullWidth = false,
  style,
  textStyle,
  leadingIcon,
  trailing,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const isPrimary = variant === "primary";

  return (
    <DebouncedTouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
      <Text style={[styles.label, !isPrimary && styles.outlineLabel, textStyle]}>{label}</Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </DebouncedTouchableOpacity>
  );
};

export default ScanActionButton;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.2)",
      shadowOpacity: theme.mode === "dark" ? 0.35 : 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      gap: theme.spacing.xs,
      minHeight: 48,
    },
    primary: {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    disabled: {
      opacity: 0.65,
    },
    label: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    outlineLabel: {
      color: theme.colors.primary,
    },
    fullWidth: {
      alignSelf: "stretch",
    },
    icon: {
      justifyContent: "center",
      alignItems: "center",
    },
    trailing: {
      marginLeft: theme.spacing.xs,
    },
  });

