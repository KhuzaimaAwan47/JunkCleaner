import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';

type DeleteButtonProps = {
  items: number;
  size: number;
  disabled: boolean;
  onPress?: () => void;
};

export default function DeleteButton({ items, size, disabled, onPress }: DeleteButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createDeleteButtonStyles(theme), [theme]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <View style={styles.footerAction}>
      <TouchableOpacity
        style={[styles.footerButton, disabled && styles.footerButtonDisabled]}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.9}
        onPress={onPress}
      >
        <Text style={styles.footerButtonText}>
          delete {items} item{items !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.footerButtonMeta}>{formatBytes(size)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createDeleteButtonStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    footerAction: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    footerButton: {
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    footerButtonDisabled: {
      backgroundColor: `${theme.colors.surfaceAlt}55`,
    },
    footerButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: 'capitalize',
    },
    footerButtonMeta: {
      color: theme.colors.white,
      fontSize: theme.fontSize.sm,
      opacity: 0.85,
    },
  });

