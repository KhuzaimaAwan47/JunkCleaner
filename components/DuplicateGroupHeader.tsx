import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import formatBytes from '../constants/formatBytes';

interface DuplicateGroupHeaderProps {
  itemCount: number;
  totalSize: number;
  onSelectAll: () => void;
}

export default function DuplicateGroupHeader({ itemCount, totalSize, onSelectAll }: DuplicateGroupHeaderProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>
        {itemCount} item{itemCount !== 1 ? 's' : ''}, {formatBytes(totalSize)}
      </Text>
      <TouchableOpacity onPress={onSelectAll} activeOpacity={0.85} style={styles.selectAllButton}>
        <Text style={styles.selectAllText}>Select all</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    headerText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    selectAllButton: {
      paddingVertical: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
    },
    selectAllText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
  });

